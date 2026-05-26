"""
F10 — Response Parser

Converts raw LLM text into validated, scored Opportunity records in PocketBase.

Pipeline:
  1. Extract   — pull JSON block from markdown fences or balanced braces
  2. Repair    — trailing commas, single quotes, // comments
  3. Validate  — Pydantic schema check
  4. Clamp     — scores outside [1, 10] are clamped, warnings emitted
  5. Recalculate — weighted score recomputed server-side (not trusted from LLM)
  6. Persist   — insert into `opportunities`, update scan status + timestamps
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.db import pb

logger = logging.getLogger(__name__)

# ── Scoring weights (spec §5.4) ───────────────────────────────────────────────

W_PAIN        = 0.30
W_TREND       = 0.20
W_COMPETITION = 0.25
W_MVP         = 0.25

SCORE_MIN, SCORE_MAX = 1.0, 10.0


# ── Parse error ───────────────────────────────────────────────────────────────

class ParseError(Exception):
    """Raised when the LLM response cannot be parsed into valid opportunities."""

    def __init__(self, kind: str, message: str, hint: str = "") -> None:
        super().__init__(message)
        self.kind    = kind    # "no_json" | "invalid_json" | "schema_error" | "empty"
        self.message = message
        self.hint    = hint

    def to_dict(self) -> dict[str, str]:
        return {"kind": self.kind, "message": self.message, "hint": self.hint}


# ── Pydantic models for LLM output ───────────────────────────────────────────

class _Scoring(BaseModel):
    pain_intensity:  float = Field(..., ge=0, le=10)
    trend_momentum:  float = Field(..., ge=0, le=10)
    competition_gap: float = Field(..., ge=0, le=10)
    mvp_feasibility: float = Field(..., ge=0, le=10)


class _Opportunity(BaseModel):
    rank:          int
    score:         float                    # LLM value — will be replaced
    name:          str
    problem:       str
    evidence:      str | list[Any]
    scoring:       _Scoring
    target_user:   str
    mvp_features:  list[str]
    monetization:  str
    build_time:    str
    reasoning:     str

    @field_validator("name", "problem", "target_user", "monetization", "build_time", "reasoning")
    @classmethod
    def _not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()


class _LLMOutput(BaseModel):
    opportunities: list[_Opportunity]


# ─────────────────────────────────────────────────────────────────────────────
# 1. JSON extraction
# ─────────────────────────────────────────────────────────────────────────────

_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _extract_json_block(text: str) -> str:
    """
    Try in order:
      1. ```json ... ``` fence
      2. ``` ... ``` fence (no language tag)
      3. First balanced { ... } block
    Returns the raw JSON string, or raises ParseError.
    """
    # Strategy 1 & 2 — code fence
    m = _FENCE_RE.search(text)
    if m:
        return m.group(1).strip()

    # Strategy 3 — first balanced { } block
    start = text.find("{")
    if start == -1:
        raise ParseError(
            "no_json",
            "No JSON block found in the response.",
            hint=(
                'Make sure the LLM wraps its answer in ```json\\n{...}\\n``` '
                "or at minimum outputs a bare JSON object starting with `{`."
            ),
        )

    depth   = 0
    in_str  = False
    escaped = False
    for i, ch in enumerate(text[start:], start):
        if escaped:
            escaped = False
            continue
        if ch == "\\" and in_str:
            escaped = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    raise ParseError(
        "no_json",
        "Found `{` but braces are unbalanced — the JSON block appears truncated.",
        hint="Ensure the full LLM response was pasted. The closing `}` may be missing.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. JSON repair
# ─────────────────────────────────────────────────────────────────────────────

_TRAILING_COMMA_RE = re.compile(r",\s*([}\]])")
_LINE_COMMENT_RE   = re.compile(r"(?<!:)//[^\n]*")   # avoid breaking https://...


def _repair_json(raw: str) -> str:
    """Apply heuristic repairs; return potentially-fixed JSON string."""
    # Remove // comments that are NOT inside strings (best-effort)
    repaired = _LINE_COMMENT_RE.sub("", raw)
    # Remove trailing commas before } or ]
    repaired = _TRAILING_COMMA_RE.sub(r"\1", repaired)
    # Replace smart/curly quotes with straight ones
    for bad, good in [("“", '"'), ("”", '"'), ("‘", "'"), ("’", "'")]:
        repaired = repaired.replace(bad, good)
    return repaired


def _parse_json(raw: str) -> dict[str, Any]:
    """Try json.loads; if it fails, apply repairs and try again."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    repaired = _repair_json(raw)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as exc:
        raise ParseError(
            "invalid_json",
            f"JSON is malformed and could not be automatically repaired: {exc}",
            hint=(
                "Check for unescaped quotes inside strings, missing commas between "
                "fields, or incomplete JSON. Use a JSON validator (e.g. jsonlint.com) "
                "to find the exact error, then resubmit."
            ),
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3 + 4. Validation and clamping
# ─────────────────────────────────────────────────────────────────────────────

def _validate(data: dict[str, Any]) -> tuple[_LLMOutput, list[str]]:
    """
    Validate against _LLMOutput schema.
    Returns (output, warnings).  Raises ParseError on schema failure.
    """
    from pydantic import ValidationError

    # Pre-clamp scores so Pydantic doesn't reject out-of-range values
    warnings: list[str] = []
    for opp in data.get("opportunities", []):
        scoring = opp.get("scoring") or {}
        for criterion in ("pain_intensity", "trend_momentum", "competition_gap", "mvp_feasibility"):
            val = scoring.get(criterion)
            if val is not None:
                clamped = max(SCORE_MIN, min(SCORE_MAX, float(val)))
                if clamped != float(val):
                    warnings.append(
                        f"Opportunity '{opp.get('name', '?')}': "
                        f"{criterion}={val} clamped to {clamped}"
                    )
                    scoring[criterion] = clamped

    try:
        output = _LLMOutput.model_validate(data)
    except ValidationError as exc:
        missing = "; ".join(
            f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}"
            for e in exc.errors()[:5]
        )
        raise ParseError(
            "schema_error",
            f"Response does not match the expected schema: {missing}",
            hint=(
                "Ensure every opportunity has all required fields: "
                "rank, score, name, problem, evidence, scoring "
                "(pain_intensity, trend_momentum, competition_gap, mvp_feasibility), "
                "target_user, mvp_features, monetization, build_time, reasoning."
            ),
        )

    if not output.opportunities:
        raise ParseError(
            "empty",
            "The response contains zero opportunities.",
            hint="Ask the LLM to try again with the same prompt, or refine the scan config.",
        )

    return output, warnings


# ─────────────────────────────────────────────────────────────────────────────
# 5. Score recalculation
# ─────────────────────────────────────────────────────────────────────────────

def _recalc_score(s: _Scoring) -> float:
    return round(
        s.pain_intensity  * W_PAIN
        + s.trend_momentum  * W_TREND
        + s.competition_gap * W_COMPETITION
        + s.mvp_feasibility * W_MVP,
        2,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 6. Persistence
# ─────────────────────────────────────────────────────────────────────────────

async def _delete_existing_opportunities(scan_id: str) -> int:
    """Remove any opportunities already linked to this scan (for retry)."""
    resp = await pb.get_list(
        "opportunities",
        filter=f'scan="{scan_id}"',
        per_page=200,
    )
    items = resp.get("items", [])
    for item in items:
        try:
            await pb.delete("opportunities", item["id"])
        except Exception as exc:
            logger.warning("[parser] Failed to delete opportunity %s: %s", item["id"], exc)
    return len(items)


async def _insert_opportunities(
    scan_id: str,
    output: _LLMOutput,
) -> list[dict[str, Any]]:
    saved: list[dict[str, Any]] = []
    for opp in output.opportunities:
        score = _recalc_score(opp.scoring)
        record = await pb.create("opportunities", {
            "scan":         scan_id,
            "rank":         opp.rank,
            "score":        score,
            "name":         opp.name,
            "problem":      opp.problem,
            "evidence":     opp.evidence,
            "scoring":      opp.scoring.model_dump(),
            "target_user":  opp.target_user,
            "mvp_features": opp.mvp_features,
            "monetization": opp.monetization,
            "build_time":   opp.build_time,
            "reasoning":    opp.reasoning,
            "user_status":  "new",
        })
        saved.append(record)
    return saved


# ─────────────────────────────────────────────────────────────────────────────
# Public async interface
# ─────────────────────────────────────────────────────────────────────────────

async def parse_response(
    scan_id: str,
    raw_text: str,
    clean_existing: bool = False,
) -> dict[str, Any]:
    """
    Parse raw LLM text into Opportunity records for scan_id.

    Args:
        scan_id:        scan to attach opportunities to
        raw_text:       full text pasted from the LLM (may include markdown)
        clean_existing: if True, delete any previously saved opportunities first (retry mode)

    Returns:
        {
            "opportunities": [saved PocketBase records],
            "count":         int,
            "warnings":      [str],   # score clamps, etc.
        }

    Raises:
        ParseError — with .kind, .message, .hint for actionable UI feedback
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. Extract JSON block
    raw_json = _extract_json_block(raw_text)

    # 2. Parse (with repair fallback)
    data = _parse_json(raw_json)

    # 3 + 4. Validate and clamp
    output, warnings = _validate(data)

    # Log clamp warnings
    for w in warnings:
        logger.warning("[parser] %s", w)

    # 5. Delete old opportunities if retrying
    if clean_existing:
        removed = await _delete_existing_opportunities(scan_id)
        if removed:
            logger.info("[parser] Removed %d existing opportunities for scan=%s", removed, scan_id)

    # 6. Persist
    await pb.update("scans", scan_id, {"status": "parsing"})
    saved = await _insert_opportunities(scan_id, output)

    await pb.update("scans", scan_id, {
        "status":       "completed",
        "completed_at": now,
    })

    logger.info(
        "[parser] %d opportunities saved for scan=%s (warnings=%d)",
        len(saved), scan_id, len(warnings),
    )

    return {
        "opportunities": saved,
        "count":         len(saved),
        "warnings":      warnings,
    }
