"""
Trends Collector - F06

Primary:  PyTrends (unofficial Google Trends Python client, no credentials).
Fallback: Playwright --> scrapes trends.google.com/trending (weekly trending
          topics). No SerpAPI required.

Output per collection:
  {
    "source":              "trends",
    "keywords":            [...],
    "timeframe":           "today 3-m",
    "geo":                 "US",
    "interest_over_time":  { "<kw>": [{"date": "YYYY-MM-DD", "value": 72}, ...] },
    "related_queries":     { "<kw>": {"top": [...], "rising": [...]} },
    "trending_topics":     [{"title": "...", "traffic": "200K+"}, ...],
    "collected_via":       "pytrends" | "playwright" | "none",
  }
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.db import pb

logger = logging.getLogger(__name__)

# ── Defaults ──────────────────────────────────────────────────────────────────

DEFAULT_KEYWORDS: list[str] = [
    "saas",
    "automation tool",
    "no-code",
    "workflow automation",
    "productivity app",
]

_TRENDING_URL = "https://trends.google.com/trending?hours=168"  # 7-day window


# ── PyTrends (primary) ────────────────────────────────────────────────────────

def _pytrends_sync(
    keywords: list[str],
    timeframe: str,
    geo: str,
) -> dict[str, Any]:
    """
    Run PyTrends synchronously.
    Returns a dict with interest_over_time and related_queries.
    Raises on any error so the caller can trigger fallback.
    """
    from pytrends.request import TrendReq  # lazy import - optional heavy dep

    pt = TrendReq(hl="en-US", tz=0, timeout=(10, 25), retries=2, backoff_factor=0.5)
    # PyTrends max 5 keywords per payload
    kws = keywords[:5]
    pt.build_payload(kws, timeframe=timeframe, geo=geo)

    # ── Interest over time ────────────────────────────────────────────────────
    iot_df = pt.interest_over_time()
    interest: dict[str, list[dict]] = {}
    if not iot_df.empty:
        iot_df = iot_df.drop(columns=["isPartial"], errors="ignore")
        for kw in iot_df.columns:
            interest[kw] = [
                {"date": str(idx.date()), "value": int(val)}
                for idx, val in iot_df[kw].items()
            ]

    # ── Related queries ───────────────────────────────────────────────────────
    related: dict[str, dict] = {}
    try:
        rq = pt.related_queries()
        for kw in kws:
            entry = rq.get(kw) or {}
            top_df    = entry.get("top")
            rising_df = entry.get("rising")
            related[kw] = {
                "top":    top_df.head(10).to_dict("records")    if top_df    is not None and not top_df.empty    else [],
                "rising": rising_df.head(10).to_dict("records") if rising_df is not None and not rising_df.empty else [],
            }
    except Exception as exc:
        logger.debug("[trends] related_queries error: %s", exc)

    return {"interest_over_time": interest, "related_queries": related}


async def _try_pytrends(
    keywords: list[str],
    timeframe: str,
    geo: str,
) -> dict[str, Any] | None:
    """Run PyTrends in a thread. Returns None on any failure."""
    try:
        result = await asyncio.to_thread(_pytrends_sync, keywords, timeframe, geo)
        logger.info("[trends] PyTrends OK - %d keywords", len(keywords))
        return result
    except Exception as exc:
        logger.warning("[trends] PyTrends failed: %s - will try Playwright fallback", exc)
        return None


# ── Playwright fallback ───────────────────────────────────────────────────────

async def _try_playwright(geo: str) -> list[dict[str, Any]]:
    """
    Scrape trends.google.com/trending for weekly trending topics.
    Returns a list of {title, traffic} dicts, or [] on failure.
    """
    try:
        from playwright.async_api import async_playwright, TimeoutError as PWTimeout
    except ImportError:
        logger.warning("[trends] Playwright not available for fallback.")
        return []

    url = _TRENDING_URL
    if geo:
        url += f"&geo={geo.upper()}"

    topics: list[dict[str, Any]] = []
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                locale="en-US",
            )
            page = await context.new_page()
            await page.route("**/*.{png,jpg,gif,woff,woff2}", lambda r: r.abort())

            await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
            # Give React a moment to render the table
            await page.wait_for_timeout(3000)

            # Each trending row: title in a link/span, traffic volume nearby
            # Google Trends trending page uses Angular/React - try multiple selectors
            rows = await page.query_selector_all(
                "tr.feed-item, div[jsname] table tr, .trending-story-title"
            )

            if not rows:
                # Fallback: grab any text that looks like trending topic + volume
                content = await page.inner_text("body")
                topics = _parse_trending_text(content)
            else:
                for row in rows[:30]:
                    try:
                        text = (await row.inner_text()).strip()
                        if text:
                            topics.append(_parse_trending_row(text))
                    except Exception:
                        continue

            await browser.close()

        logger.info("[trends] Playwright fallback scraped %d trending topics", len(topics))
    except Exception as exc:
        logger.warning("[trends] Playwright fallback failed: %s", exc)

    return [t for t in topics if t.get("title")]


def _parse_trending_row(text: str) -> dict[str, Any]:
    """Best-effort parse of a trending row text into {title, traffic}."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    title   = lines[0] if lines else text[:80]
    traffic = ""
    for line in lines[1:]:
        if re.search(r"\d+[KMB]?\+?", line):
            traffic = line.strip()
            break
    return {"title": title, "traffic": traffic}


def _parse_trending_text(body: str) -> list[dict[str, Any]]:
    """Extract trending topics from raw page text (last resort)."""
    # Look for lines that look like topic titles near traffic numbers
    topics: list[dict[str, Any]] = []
    lines = [l.strip() for l in body.splitlines() if len(l.strip()) > 3]
    for i, line in enumerate(lines[:200]):
        if re.search(r"\d{2,}[KMB]\+?", line) and i > 0:
            topics.append({"title": lines[i - 1][:100], "traffic": line.strip()})
    return topics[:30]


# ── Public async interface ────────────────────────────────────────────────────

async def collect(
    scan_id: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    """
    Collect trends data and persist to raw_data for *scan_id*.

    Config keys (all optional):
      trends_keywords   list[str]  keywords to analyse (default: DEFAULT_KEYWORDS)
      trends_timeframe  str        PyTrends timeframe string (default from settings)
      trends_geo        str        country code, e.g. "US" (default from settings)
    """
    keywords:  list[str] = config.get("trends_keywords", DEFAULT_KEYWORDS)
    timeframe: str        = config.get("trends_timeframe", settings.trends_timeframe)
    geo:       str        = config.get("trends_geo",       settings.trends_geo)

    logger.info(
        "[trends] Collecting scan=%s keywords=%s geo=%r timeframe=%r",
        scan_id, keywords, geo, timeframe,
    )

    trending_topics: list[dict] = []
    interest:        dict       = {}
    related:         dict       = {}
    collected_via:   str        = "none"

    # ── Primary: PyTrends ────────────────────────────────────────────────────
    pt_result = await _try_pytrends(keywords, timeframe, geo)
    if pt_result:
        interest      = pt_result.get("interest_over_time", {})
        related       = pt_result.get("related_queries",    {})
        collected_via = "pytrends"

    # ── Fallback: Playwright ─────────────────────────────────────────────────
    if not pt_result:
        trending_topics = await _try_playwright(geo)
        if trending_topics:
            collected_via = "playwright"

    if collected_via == "none":
        logger.warning("[trends] Both PyTrends and Playwright failed for scan=%s", scan_id)

    payload: dict[str, Any] = {
        "source":             "trends",
        "keywords":           keywords,
        "timeframe":          timeframe,
        "geo":                geo or "worldwide",
        "interest_over_time": interest,
        "related_queries":    related,
        "trending_topics":    trending_topics,
        "collected_via":      collected_via,
    }

    await pb.create("raw_data", {"scan": scan_id, "source": "trends", "data": payload})
    logger.info("[trends] Saved trends data (via=%s) for scan=%s", collected_via, scan_id)
    return payload
