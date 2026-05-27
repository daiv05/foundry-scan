"""
Cleanup service - F17

Expires raw_data for scans that have been stuck in `awaiting_llm_input`
for more than 30 days without the user completing the LLM step.

The prompt_text is left intact so the user can still see what was built;
only the (large) raw scraped data is removed to reclaim storage.

Runs once at startup, then every 24 hours.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.db import pb

logger = logging.getLogger(__name__)

EXPIRY_DAYS     = 30
INTERVAL_HOURS  = 24


async def cleanup_expired_raw_data() -> int:
    """
    Delete raw_data records whose parent scan has been in
    `awaiting_llm_input` for longer than EXPIRY_DAYS.

    Returns the number of raw_data records deleted.
    """
    cutoff   = datetime.now(timezone.utc) - timedelta(days=EXPIRY_DAYS)
    deleted  = 0

    try:
        result = await pb.get_list(
            "scans",
            filter='status="awaiting_llm_input"',
            per_page=200,
            sort="created",
        )
        stale_scans = [
            s for s in result.get("items", [])
            if _parse_created(s.get("created", "")) < cutoff
        ]

        for scan in stale_scans:
            scan_id = scan["id"]
            rd_result = await pb.get_list(
                "raw_data",
                filter=f'scan="{scan_id}"',
                per_page=100,
            )
            for record in rd_result.get("items", []):
                try:
                    await pb.delete("raw_data", record["id"])
                    deleted += 1
                except Exception as exc:
                    logger.warning(
                        "[cleanup] Could not delete raw_data %s: %s",
                        record["id"], exc,
                    )
            logger.info(
                "[cleanup] Expired raw_data for stale scan %s (created %s)",
                scan_id, scan.get("created", "")[:10],
            )

    except Exception as exc:
        logger.error("[cleanup] cleanup_expired_raw_data error: %s", exc)

    return deleted


def _parse_created(value: str) -> datetime:
    """Parse a PocketBase ISO timestamp into a timezone-aware datetime."""
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


async def run_periodic_cleanup() -> None:
    """Background loop: run cleanup at startup, then once every 24 h."""
    while True:
        try:
            n = await cleanup_expired_raw_data()
            if n:
                logger.info("[cleanup] Removed %d expired raw_data record(s)", n)
        except Exception as exc:
            logger.error("[cleanup] Periodic cleanup loop crashed: %s", exc)

        await asyncio.sleep(INTERVAL_HOURS * 3600)
