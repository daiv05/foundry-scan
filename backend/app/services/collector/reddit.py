"""
Reddit Collector — F04 (Playwright scraper)

Navigates old.reddit.com search pages with a headless Chromium browser.
No API credentials required.

Strategy:
  1. For each subreddit, run two search passes (pain keywords, demand keywords).
  2. Extract post metadata from the search results listing.
  3. Optionally load individual post pages for body + comments
     (controlled by config["fetch_comments"], default False).
  4. Detect pain/demand signals in all available text.
  5. Persist deduplicated results to raw_data.

Rate limiting:
  - Random delay of [delay, delay*2] ms between every page load.
  - On HTTP 429 / rate-limit detection: exponential backoff, up to 3 retries.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Any

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PWTimeout,
    async_playwright,
)

from app.config import settings
from app.db import pb

logger = logging.getLogger(__name__)

# ── Signal dictionaries ───────────────────────────────────────────────────────

PAIN_SIGNALS: list[str] = [
    "pain",
    "workflow",
    "manual",
    "expensive",
    "spreadsheet",
    "automation",
    "hate this tool",
    "waste time",
    "repetitive",
    "tedious",
    "frustrated",
    "broken",
    "annoying",
    "slow",
    "overpriced",
]

DEMAND_SIGNALS: list[str] = [
    "i'd pay for",
    "shut up and take my money",
    "is there a tool that",
    "looking for a solution",
    "willing to pay",
    "i need something that",
    "does anyone know a tool",
    "recommendation for",
    "take my money",
    "would pay good money",
]

DEFAULT_SUBREDDITS: list[str] = [
    "SaaS",
    "Entrepreneur",
    "smallbusiness",
    "freelance",
    "webdev",
]

# Split into short queries to stay within URL limits
_PAIN_QUERY = " OR ".join(
    f'"{kw}"' if " " in kw else kw for kw in PAIN_SIGNALS[:8]
)
_DEMAND_QUERY = " OR ".join(
    f'"{kw}"' if " " in kw else kw for kw in DEMAND_SIGNALS[:6]
)

# old.reddit.com CSS selectors (stable HTML, no JS rendering required)
_SEL_RESULT   = "div.search-result-link"
_SEL_TITLE    = "a.search-title"
_SEL_SNIPPET  = "div.search-result-snippet"
_SEL_META     = "div.search-result-footer .search-result-meta"
_SEL_COMMENT_BODY = ".commentarea .comment .usertext-body .md p"
_SEL_POST_BODY    = ".expando .usertext-body .md p"
_SEL_SCORE        = "div.score.unvoted, div.likes, span.score"

# ── Helpers ───────────────────────────────────────────────────────────────────

def _detect_signals(text: str) -> tuple[list[str], list[str]]:
    lower = text.lower()
    pain   = [s for s in PAIN_SIGNALS   if s in lower]
    demand = [s for s in DEMAND_SIGNALS if s in lower]
    return pain, demand


def _parse_count(text: str, pattern: str) -> int:
    """Extract first integer matching *pattern* from *text*, or 0."""
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            pass
    return 0


async def _controlled_goto(page: Page, url: str, delay_ms: int) -> bool:
    """Navigate to *url* with a random delay and return True on success."""
    jitter = random.randint(0, delay_ms)
    await asyncio.sleep((delay_ms + jitter) / 1000)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
        return True
    except PWTimeout:
        logger.warning("Timeout loading %s", url)
        return False
    except Exception as exc:
        logger.warning("Error loading %s: %s", url, exc)
        return False


async def _is_rate_limited(page: Page) -> bool:
    """Detect Reddit rate-limit / login-wall pages."""
    text = (await page.title()).lower()
    return "rate limit" in text or "too many requests" in text or "log in" in text


# ── Post-page scraper (optional, controlled by fetch_comments) ────────────────

async def _scrape_post_page(
    context: BrowserContext,
    url: str,
    delay_ms: int,
) -> tuple[str, list[str], int]:
    """
    Load the individual post page and return (body, comments, score).
    Returns ("", [], 0) on any failure.
    """
    page = await context.new_page()
    try:
        ok = await _controlled_goto(page, url, delay_ms)
        if not ok or await _is_rate_limited(page):
            return "", [], 0

        body_els = await page.query_selector_all(_SEL_POST_BODY)
        body = " ".join([(await el.inner_text()).strip() for el in body_els[:5]])

        comment_els = await page.query_selector_all(_SEL_COMMENT_BODY)
        comments = [(await el.inner_text()).strip() for el in comment_els[:10]]

        score_el = await page.query_selector(_SEL_SCORE)
        score_text = await score_el.inner_text() if score_el else "0"
        score = _parse_count(score_text, r"([\d,]+)")

        return body, comments, score
    except Exception as exc:
        logger.warning("Failed to scrape post %s: %s", url, exc)
        return "", [], 0
    finally:
        await page.close()


# ── Search-page scraper ───────────────────────────────────────────────────────

async def _scrape_search_page(
    page: Page,
    subreddit: str,
    query: str,
    time_filter: str,
    max_posts: int,
    delay_ms: int,
    context: BrowserContext,
    fetch_comments: bool,
    seen: set[str],
) -> list[dict[str, Any]]:
    encoded = urllib.parse.quote(query)
    url = (
        f"https://old.reddit.com/r/{subreddit}/search/"
        f"?q={encoded}&restrict_sr=on&sort=relevance&t={time_filter}"
    )

    ok = await _controlled_goto(page, url, delay_ms)
    if not ok:
        return []

    if await _is_rate_limited(page):
        logger.warning("[reddit] Rate-limited on r/%s — backing off.", subreddit)
        raise _RateLimitError()

    result_els = await page.query_selector_all(_SEL_RESULT)
    posts: list[dict[str, Any]] = []

    for el in result_els[:max_posts]:
        try:
            title_el = await el.query_selector(_SEL_TITLE)
            if not title_el:
                continue

            title = (await title_el.inner_text()).strip()
            href  = await title_el.get_attribute("href") or ""

            # Deduplicate by URL
            if href in seen:
                continue
            seen.add(href)

            # Ensure we have an old.reddit.com permalink
            post_url = href
            if not post_url.startswith("http"):
                post_url = "https://old.reddit.com" + post_url
            if "old.reddit.com" not in post_url:
                post_url = post_url.replace("www.reddit.com", "old.reddit.com")

            # Snippet available in search results
            snippet_el = await el.query_selector(_SEL_SNIPPET)
            snippet = (await snippet_el.inner_text()).strip() if snippet_el else ""

            # Meta text: "submitted X ago | X points | X comments | r/sub"
            meta_el = await el.query_selector(_SEL_META)
            meta_text = (await meta_el.inner_text()).strip() if meta_el else ""

            num_comments = _parse_count(meta_text, r"([\d,]+)\s+comments?")
            score = _parse_count(meta_text, r"([\d,]+)\s+points?")

            # Attempt to extract ISO timestamp from <time> element inside the result
            time_el = await el.query_selector("time[datetime]")
            created_utc = ""
            if time_el:
                dt_str = await time_el.get_attribute("datetime") or ""
                if dt_str:
                    created_utc = dt_str[:19].replace(" ", "T") + "Z"
            if not created_utc:
                created_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            # Optionally load the full post page
            body: str = snippet
            comments: list[str] = []
            if fetch_comments and "/comments/" in post_url:
                body, comments, post_score = await _scrape_post_page(
                    context, post_url, delay_ms
                )
                if post_score:
                    score = post_score
                if not body:
                    body = snippet

            full_text = f"{title} {body} {' '.join(comments)}"
            pain, demand = _detect_signals(full_text)

            posts.append({
                "source": "reddit",
                "subreddit": f"r/{subreddit}",
                "title": title,
                "body": body,
                "score": score,
                "num_comments": num_comments,
                "comments": comments,
                "url": post_url,
                "created_utc": created_utc,
                "pain_signals": pain,
                "demand_signals": demand,
            })

        except Exception as exc:
            logger.debug("Error parsing result element: %s", exc)
            continue

    return posts


class _RateLimitError(Exception):
    pass


# ── Public async interface ────────────────────────────────────────────────────

async def collect(
    scan_id: str,
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Scrape Reddit and persist results to raw_data for *scan_id*.

    Config keys (all optional):
      subreddits      list[str]  default: DEFAULT_SUBREDDITS
      max_posts       int        max posts per subreddit per query pass (default 20)
      time_filter     str        hour/day/week/month/year/all (default month)
      fetch_comments  bool       load post pages for body + comments (default False)
    """
    subreddits:     list[str] = config.get("subreddits", DEFAULT_SUBREDDITS)
    max_posts:      int       = int(config.get("max_posts", 20))
    time_filter:    str       = config.get("time_filter", "month")
    fetch_comments: bool      = bool(config.get("fetch_comments", settings.reddit_fetch_comments))
    delay_ms:       int       = settings.reddit_request_delay_ms

    logger.info(
        "[reddit] Collecting scan=%s subreddits=%s fetch_comments=%s",
        scan_id, subreddits, fetch_comments,
    )

    all_posts = await _run_with_retry(
        subreddits, max_posts, time_filter, fetch_comments, delay_ms
    )

    if not all_posts:
        logger.info("[reddit] No posts collected for scan=%s", scan_id)
        return []

    await pb.create("raw_data", {
        "scan":   scan_id,
        "source": "reddit",
        "data":   all_posts,
    })

    logger.info("[reddit] Saved %d posts for scan=%s", len(all_posts), scan_id)
    return all_posts


async def _run_with_retry(
    subreddits: list[str],
    max_posts: int,
    time_filter: str,
    fetch_comments: bool,
    delay_ms: int,
    max_attempts: int = 3,
) -> list[dict[str, Any]]:
    backoff = 30.0
    for attempt in range(1, max_attempts + 1):
        try:
            return await _scrape_all(
                subreddits, max_posts, time_filter, fetch_comments, delay_ms
            )
        except _RateLimitError:
            if attempt == max_attempts:
                logger.error("[reddit] Rate limit — max retries exceeded.")
                return []
            logger.warning(
                "[reddit] Rate limited — retry %d/%d in %.0fs",
                attempt, max_attempts, backoff,
            )
            await asyncio.sleep(backoff)
            backoff *= 2
        except Exception as exc:
            logger.error("[reddit] Unexpected error: %s", exc)
            return []
    return []


async def _scrape_all(
    subreddits: list[str],
    max_posts: int,
    time_filter: str,
    fetch_comments: bool,
    delay_ms: int,
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    results: list[dict[str, Any]] = []

    async with async_playwright() as pw:
        browser: Browser = await pw.chromium.launch(headless=True)
        context: BrowserContext = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            # Use a plausible desktop UA
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )
        page: Page = await context.new_page()
        # Block images/fonts to speed up loads
        await page.route(
            "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot}",
            lambda r: r.abort(),
        )

        try:
            for sub in subreddits:
                for query in (_PAIN_QUERY, _DEMAND_QUERY):
                    posts = await _scrape_search_page(
                        page, sub, query, time_filter,
                        max_posts, delay_ms, context,
                        fetch_comments, seen,
                    )
                    results.extend(posts)
                    logger.debug(
                        "[reddit] r/%s query='%s...' → %d posts",
                        sub, query[:30], len(posts),
                    )
        finally:
            await browser.close()

    return results
