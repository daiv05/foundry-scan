"""
Scan orchestration service.

Coordinates the pipeline:  collect --> process --> prompt_build --> (await LLM) --> parse
Each stage updates the scan status in PocketBase.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from app.db import pb
from app.services.collector import hackernews, producthunt, default_collector, trends
from app.services import processor, prompt_builder

logger = logging.getLogger(__name__)


async def _update_status(scan_id: str, status: str, error: str = "") -> None:
    data: dict[str, Any] = {"status": status}
    if error:
        data["error_message"] = error
    try:
        await pb.update("scans", scan_id, data)
    except Exception as exc:
        logger.error("Failed to update scan %s status to %s: %s", scan_id, status, exc)


async def run_pipeline(scan_id: str) -> None:
    """
    Run the full collection pipeline for a scan.

    Status transitions:
      pending --> collecting --> processing --> awaiting_llm_input
      (on error --> failed)
    """
    try:
        record = await pb.get_one("scans", scan_id)
    except Exception as exc:
        logger.error("Scan %s not found: %s", scan_id, exc)
        return

    config: dict[str, Any] = record.get("config") or {}

    # ── Stage 1: Collecting (10-minute hard timeout) ─────────────────────
    await _update_status(scan_id, "collecting")
    sources_enabled: list[str] = config.get(
        "sources", ["reddit", "hackernews", "trends", "producthunt"]
    )

    collection_tasks: list = []
    task_labels:      list[str] = []
    if "reddit" in sources_enabled:
        collection_tasks.append(_run_reddit(scan_id, config))
        task_labels.append("reddit")
    if "hackernews" in sources_enabled:
        collection_tasks.append(_run_hackernews(scan_id, config))
        task_labels.append("hackernews")
    if "trends" in sources_enabled:
        collection_tasks.append(_run_trends(scan_id, config))
        task_labels.append("trends")
    if "producthunt" in sources_enabled:
        collection_tasks.append(_run_producthunt(scan_id, config))
        task_labels.append("producthunt")

    # Run all collectors concurrently; individual failures are caught per-source.
    # A global 10-minute wall-clock timeout protects against hung collectors.
    try:
        results = await asyncio.wait_for(
            asyncio.gather(*collection_tasks, return_exceptions=True),
            timeout=600.0,
        )
    except asyncio.TimeoutError:
        logger.error("[pipeline] Collecting phase timed out (>10 min) for scan=%s", scan_id)
        await _update_status(
            scan_id,
            "failed",
            "Collection timed out after 10 minutes. "
            "Try again with fewer sources or check your network connection.",
        )
        return

    # Log per-source failures (non-fatal - scan continues with data already collected)
    failed_sources = [
        label for label, r in zip(task_labels, results) if isinstance(r, Exception)
    ]
    if failed_sources:
        logger.warning(
            "[pipeline] Sources failed (non-fatal) for scan=%s: %s",
            scan_id, failed_sources,
        )

    # ── Stage 2: Processing (F08) ─────────────────────────────────────────
    await _update_status(scan_id, "processing")
    try:
        processed = await processor.process(scan_id)
        processed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        await pb.update("scans", scan_id, {"processed_at": processed_at})
        logger.info(
            "[pipeline] Processor: %d clusters from %d items (scan=%s)",
            processed["metadata"]["cluster_count"],
            processed["metadata"]["items_clustered"],
            scan_id,
        )
    except Exception as exc:
        logger.error("[pipeline] Processor failed for scan=%s: %s", scan_id, exc)
        await _update_status(scan_id, "failed", str(exc))
        return

    # ── Stage 3: Prompt building (F09) ───────────────────────────────────
    try:
        prompt_text, token_est = await prompt_builder.build_prompt(scan_id, processed)
        logger.info(
            "[pipeline] Prompt built: ~%d tokens (scan=%s)",
            token_est, scan_id,
        )
    except Exception as exc:
        logger.error("[pipeline] Prompt builder failed for scan=%s: %s", scan_id, exc)
        await _update_status(scan_id, "failed", str(exc))
        return

    await _update_status(scan_id, "awaiting_llm_input")
    logger.info("Pipeline completed for scan=%s", scan_id)


async def _run_reddit(scan_id: str, config: dict[str, Any]) -> None:
    try:
        posts = await default_collector.collect(scan_id, config)
        logger.info("[pipeline] Reddit: %d posts collected for scan=%s", len(posts), scan_id)
    except Exception as exc:
        logger.error("[pipeline] Reddit collector failed for scan=%s: %s", scan_id, exc)
        # Non-fatal: scan continues with other sources


async def _run_trends(scan_id: str, config: dict[str, Any]) -> None:
    try:
        result = await trends.collect(scan_id, config)
        logger.info("[pipeline] Trends: collected via=%s for scan=%s", result.get("collected_via"), scan_id)
    except Exception as exc:
        logger.error("[pipeline] Trends collector failed for scan=%s: %s", scan_id, exc)


async def _run_hackernews(scan_id: str, config: dict[str, Any]) -> None:
    try:
        items = await hackernews.collect(scan_id, config)
        logger.info("[pipeline] HN: %d items collected for scan=%s", len(items), scan_id)
    except Exception as exc:
        logger.error("[pipeline] HN collector failed for scan=%s: %s", scan_id, exc)


async def _run_producthunt(scan_id: str, config: dict[str, Any]) -> None:
    try:
        result = await producthunt.collect(scan_id, config)
        niches = len(result.get("niches", {})) if result else 0
        logger.info("[pipeline] ProductHunt: %d niches for scan=%s", niches, scan_id)
    except Exception as exc:
        logger.error("[pipeline] ProductHunt collector failed for scan=%s: %s", scan_id, exc)


async def _stub_source(scan_id: str, source: str) -> None:
    logger.info("[pipeline] %s collector not yet implemented (scan=%s) - skipping.", source, scan_id)
