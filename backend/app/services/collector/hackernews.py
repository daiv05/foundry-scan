"""
Hacker News Collector - F05

Uses the public HN Firebase API (no auth required).
  https://hacker-news.firebaseio.com/v0/

Feeds consumed:
  - topstories  (top 50)
  - newstories  (top 50)
  - askstories  (all, score-filtered)
  - showstories (all, score-filtered)

Flow:
  1. Fetch story-ID lists from all four feeds concurrently.
  2. Deduplicate, then fetch item details in parallel (semaphore-limited).
  3. Apply score >= min_score and relevance keyword filter.
  4. For each matching item, fetch top-N comments in parallel.
  5. Detect pain/demand signals across title + text + comments.
  6. Persist to raw_data collection.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.db import pb
from app.services.collector.default_collector import DEMAND_SIGNALS, PAIN_SIGNALS

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

HN_BASE = "https://hacker-news.firebaseio.com/v0"

FEEDS: dict[str, str] = {
    "top":  "topstories",
    "new":  "newstories",
    "ask":  "askstories",
    "show": "showstories",
}

# Keywords for relevance filtering of top/new stories
# (Ask HN and Show HN items pass automatically)
RELEVANCE_KEYWORDS: list[str] = [
    "saas", "automation", "tool", "productivity", "workflow",
    "startup", "indie", "maker", "api", "software", "app",
    "business", "revenue", "customer", "pain", "problem",
    "solution", "micro", "b2b", "subscription", "side project",
    "mvp", "launch", "bootstrapped",
]

_CONCURRENCY = 30   # max parallel item fetches
_TIMEOUT     = 10.0 # seconds per request


# ── Helpers ───────────────────────────────────────────────────────────────────

def _post_type(title: str) -> str:
    t = title.lower()
    if t.startswith("ask hn"):
        return "ask_hn"
    if t.startswith("show hn"):
        return "show_hn"
    return "story"


def _is_relevant(item: dict[str, Any]) -> bool:
    """True for Ask/Show HN, or if title/text contain a relevance keyword."""
    title = (item.get("title") or "").lower()
    text  = (item.get("text")  or "").lower()

    if title.startswith("ask hn") or title.startswith("show hn"):
        return True

    combined = f"{title} {text}"
    return any(kw in combined for kw in RELEVANCE_KEYWORDS)


def _detect_signals(text: str) -> tuple[list[str], list[str]]:
    lower = text.lower()
    pain   = [s for s in PAIN_SIGNALS   if s in lower]
    demand = [s for s in DEMAND_SIGNALS if s in lower]
    return pain, demand


def _format_utc(ts: int | None) -> str:
    if not ts:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── API fetchers ──────────────────────────────────────────────────────────────

async def _get_json(client: httpx.AsyncClient, url: str) -> Any:
    resp = await client.get(url, timeout=_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


async def _fetch_ids(client: httpx.AsyncClient, feed: str) -> list[int]:
    try:
        ids = await _get_json(client, f"{HN_BASE}/{FEEDS[feed]}.json")
        return ids if isinstance(ids, list) else []
    except Exception as exc:
        logger.warning("[hn] Failed to fetch %s feed: %s", feed, exc)
        return []


async def _fetch_item(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    item_id: int,
) -> dict[str, Any] | None:
    async with sem:
        try:
            return await _get_json(client, f"{HN_BASE}/item/{item_id}.json")
        except Exception as exc:
            logger.debug("[hn] Failed to fetch item %d: %s", item_id, exc)
            return None


async def _fetch_comment_text(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    comment_id: int,
) -> str:
    async with sem:
        try:
            data = await _get_json(client, f"{HN_BASE}/item/{comment_id}.json")
            if data and data.get("type") == "comment":
                # HN comment text is HTML-encoded; strip tags simply
                raw = data.get("text") or ""
                return _strip_html(raw)
        except Exception:
            pass
        return ""


def _strip_html(html: str) -> str:
    """Very simple HTML tag remover for HN comment text."""
    import re
    text = re.sub(r"<[^>]+>", " ", html)
    text = text.replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&").replace("&#x27;", "'")
    return " ".join(text.split())


# ── Main collector ────────────────────────────────────────────────────────────

async def collect(
    scan_id: str,
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Collect HN stories and persist to raw_data for *scan_id*.

    Config keys (all optional):
      hn_max_per_feed   int   max IDs to consider per feed (default 50)
      hn_min_score      int   minimum post score (default 5)
      hn_max_comments   int   max comments to fetch per post (default 10)
    """
    max_per_feed:  int = int(config.get("hn_max_per_feed",  50))
    min_score:     int = int(config.get("hn_min_score",      5))
    max_comments:  int = int(config.get("hn_max_comments",  10))

    logger.info(
        "[hn] Collecting scan=%s max_per_feed=%d min_score=%d",
        scan_id, max_per_feed, min_score,
    )

    async with httpx.AsyncClient() as client:
        results = await _run(client, max_per_feed, min_score, max_comments)

    if not results:
        logger.info("[hn] No relevant items for scan=%s", scan_id)
        return []

    await pb.create("raw_data", {
        "scan":   scan_id,
        "source": "hackernews",
        "data":   results,
    })

    logger.info("[hn] Saved %d items for scan=%s", len(results), scan_id)
    return results


async def _run(
    client: httpx.AsyncClient,
    max_per_feed: int,
    min_score: int,
    max_comments: int,
) -> list[dict[str, Any]]:
    sem = asyncio.Semaphore(_CONCURRENCY)

    # 1. Fetch all feed ID lists concurrently
    id_lists = await asyncio.gather(*[
        _fetch_ids(client, feed) for feed in FEEDS
    ])

    # 2. Deduplicate - preserve ask/show ordering (they get priority)
    seen_ids: set[int] = set()
    candidate_ids: list[int] = []
    for ids in id_lists:
        for id_ in ids[:max_per_feed]:
            if id_ not in seen_ids:
                seen_ids.add(id_)
                candidate_ids.append(id_)

    logger.debug("[hn] %d unique candidate IDs across all feeds", len(candidate_ids))

    # 3. Fetch item details concurrently
    items_raw = await asyncio.gather(*[
        _fetch_item(client, sem, id_) for id_ in candidate_ids
    ])

    # 4. Filter: must be a story, score >= min_score, relevant
    items: list[dict[str, Any]] = []
    for item in items_raw:
        if not item:
            continue
        if item.get("type") != "story":
            continue
        if (item.get("score") or 0) < min_score:
            continue
        if item.get("dead") or item.get("deleted"):
            continue
        if not _is_relevant(item):
            continue
        items.append(item)

    logger.debug("[hn] %d items pass score+relevance filter", len(items))

    # 5. Fetch comments for each item concurrently
    results: list[dict[str, Any]] = []
    comment_tasks = [
        _fetch_comments(client, sem, item, max_comments) for item in items
    ]
    formatted = await asyncio.gather(*comment_tasks, return_exceptions=True)

    for entry in formatted:
        if isinstance(entry, dict):
            results.append(entry)

    return results


async def _fetch_comments(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    item: dict[str, Any],
    max_comments: int,
) -> dict[str, Any]:
    """Fetch top-level comments and return a formatted post dict."""
    kid_ids: list[int] = (item.get("kids") or [])[:max_comments]

    comments: list[str] = []
    if kid_ids:
        texts = await asyncio.gather(*[
            _fetch_comment_text(client, sem, kid) for kid in kid_ids
        ])
        comments = [t for t in texts if t]

    title    = item.get("title") or ""
    text     = _strip_html(item.get("text") or "")
    full_txt = f"{title} {text} {' '.join(comments)}"
    pain, demand = _detect_signals(full_txt)

    return {
        "source":         "hackernews",
        "title":          title,
        "url":            item.get("url") or f"https://news.ycombinator.com/item?id={item['id']}",
        "score":          item.get("score")       or 0,
        "num_comments":   item.get("descendants") or 0,
        "comments":       comments,
        "created_utc":    _format_utc(item.get("time")),
        "type":           _post_type(title),
        "pain_signals":   pain,
        "demand_signals": demand,
    }
