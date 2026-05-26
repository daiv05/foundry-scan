from __future__ import annotations

from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/status")
async def get_settings_status():
    """
    Return a read-only snapshot of the current backend configuration:
    - Status of each data source (ready / configured / not_configured)
    - Active env var values (no secrets exposed — only presence flags for tokens)
    """
    ph_configured = bool(settings.producthunt_token)

    return {
        "sources": {
            "reddit": {
                "name": "Reddit",
                "status": "ready",
                "method": "Playwright scraping — no credentials required",
                "config": {
                    "delay_ms": settings.reddit_request_delay_ms,
                    "fetch_comments": settings.reddit_fetch_comments,
                },
            },
            "hackernews": {
                "name": "Hacker News",
                "status": "ready",
                "method": "Public Firebase API — no credentials required",
                "config": {},
            },
            "trends": {
                "name": "Google Trends",
                "status": "ready",
                "method": "PyTrends primary + Playwright fallback — no credentials required",
                "config": {
                    "geo": settings.trends_geo or "(not set — global)",
                    "timeframe": settings.trends_timeframe,
                },
            },
            "producthunt": {
                "name": "Product Hunt",
                "status": "configured" if ph_configured else "not_configured",
                "method": "GraphQL v2 API — token optional",
                "config": {
                    "token_set": ph_configured,
                },
            },
        },
        "env_vars": {
            "PRODUCTHUNT_TOKEN": {
                "set": ph_configured,
                "required": False,
                "description": "Product Hunt API token (GraphQL v2). Optional — if absent, PH source is skipped.",
                "hint": "Create a developer app at https://www.producthunt.com/v2/oauth/applications",
            },
            "TRENDS_GEO": {
                "value": settings.trends_geo or "",
                "default": "",
                "description": "Geographic region for Google Trends (e.g. US, ES, GB). Empty = global.",
            },
            "TRENDS_TIMEFRAME": {
                "value": settings.trends_timeframe,
                "default": "today 3-m",
                "description": "Time window for Google Trends. PyTrends format, e.g. 'today 3-m', 'today 12-m'.",
            },
            "REDDIT_REQUEST_DELAY_MS": {
                "value": settings.reddit_request_delay_ms,
                "default": 2000,
                "description": "Delay between Reddit page requests in milliseconds. Increase if getting blocked.",
            },
            "REDDIT_FETCH_COMMENTS": {
                "value": settings.reddit_fetch_comments,
                "default": False,
                "description": "Whether to scrape post comments (slower, more data).",
            },
        },
        "instructions": {
            "how_to_update": (
                "Edit backend/.env, then run: "
                "docker compose up -d --force-recreate backend"
            ),
            "note": (
                "docker compose restart does NOT re-read env_file. "
                "Use --force-recreate to pick up new env vars."
            ),
        },
    }
