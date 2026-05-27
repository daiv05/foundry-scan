from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException, Response
from fastapi.responses import PlainTextResponse

from app.db import pb
from app.models.schemas import (
    LLMResponseInput,
    OpportunityResponse,
    ScanArchive,
    ScanCreate,
    ScanResponse,
    ScanStatus,
)
from app.services.scan_service import run_pipeline
from app.services.response_parser import parse_response, ParseError

router = APIRouter(prefix="/api/scans", tags=["scans"])


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=ScanResponse, status_code=201)
async def create_scan(body: ScanCreate, background_tasks: BackgroundTasks):
    """Create a new scan (status=pending) and kick off the pipeline in the background."""
    record = await pb.create("scans", {"status": "pending", "config": body.config})
    background_tasks.add_task(run_pipeline, record["id"])
    return ScanResponse(**record)


@router.get("", response_model=list[ScanResponse])
async def list_scans(
    page: int = 1,
    per_page: int = 50,
    sort: str = "-created",
    archived: bool = False,
):
    # archived=false --> non-archived only; archived=true --> archived only
    filter_str = "archived=true" if archived else "archived!=true"
    result = await pb.get_list("scans", page=page, per_page=per_page, sort=sort, filter=filter_str)
    return [ScanResponse(**r) for r in result.get("items", [])]


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str):
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanResponse(**record)


@router.get("/{scan_id}/status", response_model=ScanStatus)
async def get_scan_status(scan_id: str):
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanStatus(
        id=record["id"],
        status=record.get("status", "pending"),
        error_message=record.get("error_message"),
    )


@router.delete("/{scan_id}", status_code=204)
async def delete_scan(scan_id: str):
    try:
        await pb.delete("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
    return Response(status_code=204)


@router.patch("/{scan_id}", response_model=ScanResponse)
async def patch_scan(scan_id: str, body: ScanArchive):
    """Update the archived flag on a scan."""
    try:
        record = await pb.update("scans", scan_id, {"archived": body.archived})
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanResponse(**record)


# ── Prompt & LLM response ────────────────────────────────────────────────────

@router.get("/{scan_id}/prompt", response_class=PlainTextResponse)
async def get_prompt(scan_id: str):
    # F09 will populate this; return stub until then
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
    prompt = record.get("prompt_text") or ""
    if not prompt:
        raise HTTPException(status_code=425, detail="Prompt not ready yet - run the scan pipeline first")
    return PlainTextResponse(content=prompt)


@router.post("/{scan_id}/response", status_code=202)
async def submit_response(scan_id: str, body: LLMResponseInput):
    """
    Accept raw LLM response text, parse it, and persist opportunities.

    Returns 202 with opportunity count on success.
    Returns 422 with parse error details on failure (scan stays retryable).
    """
    # 1. Fetch scan and guard against bad states
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")

    if record.get("status") not in ("awaiting_llm_input", "parsing"):
        raise HTTPException(
            status_code=409,
            detail=f"Scan is in status '{record.get('status')}' - expected 'awaiting_llm_input'.",
        )

    # 2. Persist raw response + metadata
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    await pb.update("scans", scan_id, {
        "llm_response_raw": body.response_text,
        "llm_used":         body.llm_used or "",
        "submitted_at":     now,
        "status":           "parsing",
    })

    # 3. Parse
    try:
        result = await parse_response(scan_id, body.response_text, clean_existing=False)
    except ParseError as exc:
        # Revert status so the user can retry
        await pb.update("scans", scan_id, {"status": "awaiting_llm_input"})
        raise HTTPException(status_code=422, detail=exc.to_dict())
    except Exception as exc:
        await pb.update("scans", scan_id, {"status": "awaiting_llm_input"})
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "id":       scan_id,
        "status":   "completed",
        "count":    result["count"],
        "warnings": result["warnings"],
    }


@router.post("/{scan_id}/response/retry", status_code=202)
async def retry_parse(scan_id: str):
    """
    Re-parse the previously stored llm_response_raw.
    Deletes existing opportunities and replaces them with a fresh parse.
    Useful after manually fixing the stored JSON via /response/raw.
    """
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")

    raw = record.get("llm_response_raw") or ""
    if not raw:
        raise HTTPException(status_code=409, detail="No stored response to retry - submit one first.")

    try:
        result = await parse_response(scan_id, raw, clean_existing=True)
    except ParseError as exc:
        await pb.update("scans", scan_id, {"status": "awaiting_llm_input"})
        raise HTTPException(status_code=422, detail=exc.to_dict())
    except Exception as exc:
        await pb.update("scans", scan_id, {"status": "awaiting_llm_input"})
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "id":       scan_id,
        "status":   "completed",
        "count":    result["count"],
        "warnings": result["warnings"],
    }


@router.get("/{scan_id}/response/raw")
async def get_raw_response(scan_id: str):
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
    raw = record.get("llm_response_raw")
    if not raw:
        raise HTTPException(status_code=404, detail="No raw response stored yet")
    return {"id": scan_id, "llm_response_raw": raw, "llm_used": record.get("llm_used")}


# ── Opportunities (scoped to scan) ───────────────────────────────────────────

@router.get("/{scan_id}/opportunities", response_model=list[OpportunityResponse])
async def get_scan_opportunities(scan_id: str, page: int = 1, per_page: int = 50):
    result = await pb.get_list(
        "opportunities",
        page=page,
        per_page=per_page,
        filter=f'scan="{scan_id}"',
        sort="rank",
    )
    return [OpportunityResponse(**r) for r in result.get("items", [])]


# ── Export ───────────────────────────────────────────────────────────────────

@router.get("/{scan_id}/export/markdown", response_class=PlainTextResponse)
async def export_markdown(scan_id: str):
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await pb.get_list(
        "opportunities",
        filter=f'scan="{scan_id}"',
        sort="rank",
        per_page=50,
    )
    opps = result.get("items", [])
    md = _build_markdown(record, opps)
    return PlainTextResponse(
        content=md,
        headers={"Content-Disposition": f'attachment; filename="report-{scan_id}.md"'},
    )


def _build_markdown(scan: dict, opps: list) -> str:
    from datetime import datetime, timezone

    completed = scan.get("completed_at") or scan.get("created") or ""
    try:
        dt = datetime.fromisoformat(completed.replace("Z", "+00:00"))
        date_str = dt.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        date_str = completed

    lines: list[str] = [
        f"# FoundryScan Report - {date_str}",
        "",
        "## Scan Metadata",
        "",
        f"| Field | Value |",
        f"|---|---|",
        f"| Scan ID | `{scan['id']}` |",
        f"| Status | {scan.get('status', '-')} |",
        f"| LLM used | {scan.get('llm_used') or '-'} |",
        f"| Prompt tokens | {scan.get('prompt_tokens_est') or '-'} |",
        f"| Opportunities | {len(opps)} |",
        "",
        "## Opportunities Summary",
        "",
        "| Rank | Score | Name | Problem |",
        "|---|---|---|---|",
    ]

    for opp in opps:
        rank  = opp.get("rank", "-")
        score = f"{opp.get('score', 0):.1f}" if opp.get("score") else "-"
        name  = (opp.get("name") or "-").replace("|", "\\|")
        prob  = (opp.get("problem") or "-")[:80].replace("|", "\\|")
        lines.append(f"| {rank} | {score} | {name} | {prob} |")

    lines.append("")

    for opp in opps:
        name  = opp.get("name") or "Unnamed"
        score = opp.get("score")
        scoring = opp.get("scoring") or {}
        lines += [
            f"## #{opp.get('rank', '?')} - {name}",
            "",
            f"**Score:** {f'{score:.2f}' if score else '-'}",
            "",
            f"**Problem:** {opp.get('problem') or '-'}",
            "",
        ]

        evidence = opp.get("evidence")
        if evidence:
            ev_text = evidence if isinstance(evidence, str) else ", ".join(str(e) for e in evidence)
            lines += [f"**Evidence:** {ev_text}", ""]

        if scoring:
            lines += [
                "### Scoring",
                "",
                "| Criterion | Score | Weight |",
                "|---|---|---|",
                f"| Pain intensity   | {scoring.get('pain_intensity', '-')} | 30% |",
                f"| Trend momentum   | {scoring.get('trend_momentum', '-')} | 20% |",
                f"| Competition gap  | {scoring.get('competition_gap', '-')} | 25% |",
                f"| MVP feasibility  | {scoring.get('mvp_feasibility', '-')} | 25% |",
                "",
            ]

        if opp.get("target_user"):
            lines += [f"**Target user:** {opp['target_user']}", ""]

        mvp = opp.get("mvp_features") or []
        if mvp:
            lines += ["**MVP Features:**", ""]
            for f in mvp:
                lines.append(f"- {f}")
            lines.append("")

        if opp.get("monetization"):
            lines += [f"**Monetization:** {opp['monetization']}", ""]
        if opp.get("build_time"):
            lines += [f"**Build time:** {opp['build_time']}", ""]
        if opp.get("reasoning"):
            lines += [f"**Reasoning:** {opp['reasoning']}", ""]

        lines.append("---")
        lines.append("")

    lines += [
        "_Generated by FoundryScan_",
    ]
    return "\n".join(lines)


@router.get("/{scan_id}/export/prompt.txt", response_class=PlainTextResponse)
async def export_prompt_txt(scan_id: str):
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Scan not found")
    prompt = record.get("prompt_text") or ""
    if not prompt:
        raise HTTPException(status_code=425, detail="Prompt not ready yet")
    return PlainTextResponse(
        content=prompt,
        headers={"Content-Disposition": f'attachment; filename="prompt-{scan_id}.txt"'},
    )
