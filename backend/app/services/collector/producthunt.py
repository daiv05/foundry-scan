"""
Product Hunt Collector - F07

Role: competition & saturation filter only.
Not used for opportunity discovery - used to score how saturated a niche
already is (feeds `low_competition` in the Processor, F08).

API: Product Hunt GraphQL v2
  Endpoint: https://api.producthunt.com/v2/api/graphql
  Auth:     Bearer token (PRODUCTHUNT_TOKEN env var)
  Docs:     https://api.producthunt.com/v2/docs

If the token is missing or the API is down, logs a warning and returns
empty data - scan continues with other sources.

Output shape stored in raw_data.data:
  {
    "source":   "producthunt",
    "keywords": [...],
    "niches": {
      "<keyword>": {
        "topic_slug":        "saas",
        "total_found":       45,
        "recent_6m":         12,
        "avg_votes":         284.3,
        "saturation_score":  6.8,   # 0-10, higher = more saturated
        "top_products": [
          {
            "name":        "...",
            "tagline":     "...",
            "votes":       1234,
            "comments":    56,
            "url":         "...",
            "created_at":  "2025-11-01T00:00:00Z",
            "topics":      ["SaaS", "Productivity"]
          }, ...
        ]
      }
    }
  }
"""
from __future__ import annotations

import asyncio
import logging
import math
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import settings
from app.db import pb

logger = logging.getLogger(__name__)

PH_GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql"
_TIMEOUT = 15.0

# ── Keyword --> PH topic slug mapping ──────────────────────────────────────────
# PH topic slugs are lowercase-hyphenated. If a keyword isn't listed here,
# we derive a slug automatically (lowercase, spaces --> hyphens).

KEYWORD_TO_SLUG: dict[str, str] = {
    "saas":                 "saas",
    "automation tool":      "automation",
    "automation":           "automation",
    "no-code":              "no-code",
    "no code":              "no-code",
    "workflow automation":  "workflow",
    "workflow":             "workflow",
    "productivity app":     "productivity",
    "productivity":         "productivity",
    "developer tools":      "developer-tools",
    "ai":                   "artificial-intelligence",
    "machine learning":     "machine-learning",
    "analytics":            "analytics",
    "crm":                  "crm",
    "marketing":            "marketing",
    "finance":              "finance",
}

_QUERY = """
query CollectNiche($topic: String!, $after: DateTime, $first: Int!) {
  posts(topic: $topic, postedAfter: $after, first: $first, order: VOTES) {
    totalCount
    edges {
      node {
        name
        tagline
        votesCount
        commentsCount
        url
        createdAt
        topics {
          edges {
            node { name }
          }
        }
      }
    }
  }
}
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_slug(keyword: str) -> str:
    return KEYWORD_TO_SLUG.get(keyword.lower(),
           re.sub(r"\s+", "-", keyword.lower().strip()))


def _saturation_score(total: int, recent: int, avg_votes: float) -> float:
    """
    0-10 score: higher = more saturated niche.
      density  (60 %): log-scaled count of products (100+ products --> 10)
      recency  (25 %): fraction of products launched in the last 6 months
      activity (15 %): avg vote count, log-scaled (1 000+ avg votes --> 10)
    """
    density  = min(10.0, math.log1p(total) / math.log1p(100) * 10)
    recency  = (recent / total * 10) if total else 0.0
    activity = min(10.0, math.log1p(avg_votes) / math.log1p(1000) * 10)
    return round(density * 0.60 + recency * 0.25 + activity * 0.15, 2)


def _parse_post(node: dict) -> dict[str, Any]:
    topics = [
        e["node"]["name"]
        for e in (node.get("topics") or {}).get("edges", [])
    ]
    return {
        "name":       node.get("name", ""),
        "tagline":    node.get("tagline", ""),
        "votes":      node.get("votesCount", 0),
        "comments":   node.get("commentsCount", 0),
        "url":        node.get("url", ""),
        "created_at": node.get("createdAt", ""),
        "topics":     topics,
    }


# ── GraphQL client ────────────────────────────────────────────────────────────

async def _gql(
    client: httpx.AsyncClient,
    token: str,
    variables: dict[str, Any],
) -> dict[str, Any]:
    resp = await client.post(
        PH_GRAPHQL_URL,
        json={"query": _QUERY, "variables": variables},
        headers={
            "Authorization":  f"Bearer {token}",
            "Content-Type":   "application/json",
            "Accept":         "application/json",
        },
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    body = resp.json()
    if "errors" in body:
        raise RuntimeError(f"GraphQL errors: {body['errors']}")
    return body.get("data", {}).get("posts", {})


async def _fetch_niche(
    client: httpx.AsyncClient,
    token: str,
    keyword: str,
    first: int,
    months_back: int,
) -> dict[str, Any]:
    slug  = _to_slug(keyword)
    after = (datetime.now(timezone.utc) - timedelta(days=30 * months_back)).strftime(
        "%Y-%m-%dT00:00:00Z"
    )
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)

    try:
        data = await _gql(client, token, {"topic": slug, "after": after, "first": first})
    except Exception as exc:
        logger.warning("[ph] Query failed for '%s' (slug=%s): %s", keyword, slug, exc)
        return _empty_niche(keyword, slug)

    total      = data.get("totalCount", 0)
    edges      = data.get("edges", [])
    posts      = [_parse_post(e["node"]) for e in edges if e.get("node")]

    votes_list = [p["votes"] for p in posts]
    avg_votes  = sum(votes_list) / len(votes_list) if votes_list else 0.0

    recent = sum(
        1 for p in posts
        if p["created_at"] and
        datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")) > six_months_ago
    )

    return {
        "topic_slug":       slug,
        "total_found":      total,
        "recent_6m":        recent,
        "avg_votes":        round(avg_votes, 1),
        "saturation_score": _saturation_score(total, recent, avg_votes),
        "top_products":     posts[:10],
    }


def _empty_niche(keyword: str, slug: str) -> dict[str, Any]:
    return {
        "topic_slug":       slug,
        "total_found":      0,
        "recent_6m":        0,
        "avg_votes":        0.0,
        "saturation_score": 0.0,
        "top_products":     [],
    }


# ── Public async interface ────────────────────────────────────────────────────

async def collect(
    scan_id: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    """
    Fetch Product Hunt competition data and persist to raw_data.

    Config keys (all optional):
      ph_keywords     list[str]  niches to analyse (defaults to trends_keywords)
      ph_first        int        products to fetch per niche (default 20)
      ph_months_back  int        how far back to look (default 12)
    """
    token = settings.producthunt_token
    if not token:
        logger.warning("[ph] PRODUCTHUNT_TOKEN not set - skipping.")
        return {}

    keywords:    list[str] = config.get(
        "ph_keywords",
        config.get("trends_keywords", ["saas", "automation", "no-code", "productivity"]),
    )
    first:       int = int(config.get("ph_first",       20))
    months_back: int = int(config.get("ph_months_back", 12))

    logger.info("[ph] Collecting scan=%s keywords=%s", scan_id, keywords)

    niches: dict[str, Any] = {}
    async with httpx.AsyncClient() as client:
        tasks = {
            kw: _fetch_niche(client, token, kw, first, months_back)
            for kw in keywords
        }
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for kw, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                logger.warning("[ph] Error for '%s': %s", kw, result)
                niches[kw] = _empty_niche(kw, _to_slug(kw))
            else:
                niches[kw] = result

    payload: dict[str, Any] = {
        "source":   "producthunt",
        "keywords": keywords,
        "niches":   niches,
    }

    await pb.create("raw_data", {"scan": scan_id, "source": "producthunt", "data": payload})
    logger.info("[ph] Saved competition data for %d niches (scan=%s)", len(niches), scan_id)
    return payload
