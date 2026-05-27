# F16 - Settings & Configuration

## Purpose

Configuration page that displays the status of data sources, active environment variables, and allows you to manage the default scan subreddits.

## Scope

### Page: /settings

#### 1. Data Sources panel

4 cards with status badges:

| Source | Status | Credentials |
| ------------- | ----------- | ------------ |
| Reddit | Ready | None (Playwright scraping) |
| Hacker News | Ready | None (Public API) |
| Google Trends | Ready | None (PyTrends + Playwright fallback) |
| Product Hunt | Configured / Not configured | `PRODUCTHUNT_TOKEN` optional |

Each card displays: name, status badge, connection method, and active configuration (related environment variable values).

#### 2. Environment Variables Panel

Read-only table of active backend environment variables:

| Variable | Type |
| ------------------------- | -------- |
| `PRODUCTHUNT_TOKEN` | presence (set / not set) - token never exposed |
| `TRENDS_GEO` | current value |
| `TRENDS_TIMEFRAME` | current value |
| `COLLECTOR_REQUEST_DELAY_MS` | current value |
| `REDDIT_FETCH_COMMENTS` | current value |

Includes instructions on how to update: edit `backend/.env` + `docker compose up -d --force-recreate backend`.

> **Note:** Environment variables are NOT editable from the UI (security + containers need `--force-recreate` to reload, not just restart).

#### 3. Scan Defaults Panel

Editor of default subreddits stored in `scan_configs` with `is_default=true`.

- Removable tags per subreddit
- Input to add new subreddits (Enter or Add button)
- "Save defaults" button - POST or PUT depending on whether a default already exists
- `/scan/new` loads these defaults on initialization

### New Endpoint

| Method | Path | Description |
| ------ | --------------------- | --------------------------------------------- |
| GET | /api/settings/status | Source status + snapshot of active configuration |

The `/api/configs` endpoints (CRUD) have existed since F03 and are used for scan defaults.

### Relevant Environment Variables (updated vs. original spec)

The variables `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and `SERPAPI_KEY` have been removed.
Only `PRODUCTHUNT_TOKEN` requires manual configuration.

## Acceptance Criteria

- [x] Settings page accessible from navigation
- [x] Displays connection status for each data source
- [x] Basic default subreddit configuration (editable, persisted in the database)
- [x] Clear UI indicating which keys go in the backend environment variables with exact instructions

## Dependencies

- F11 (shell and routing)
- F03 (config endpoints, settings/status)

## Ref SPEC

Section 8.1 (route /settings), section 7.1 (config endpoints)