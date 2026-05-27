# F04 - Reddit Collector

## Objective

Collect Reddit posts and comments that contain pain points or genuine demand for SaaS tools.

## Scope

### Library

**Playwright** (scraping of `old.reddit.com`). No credentials required - anonymous public access.

### Relevant Environment Variables

```
COLLECTOR_REQUEST_DELAY_MS=2000 # pause between requests (ms)
REDDIT_FETCH_COMMENTS=true # whether to fetch comments
```

### Subreddits

**Default:** r/SaaS, r/Entrepreneur, r/smallbusiness, r/freelance, r/webdev

Configurable from the app (via scan configuration).

### Pain Keywords

```
pain, workflow, manual, expensive, spreadsheet, automation,
hate this tool, waste time, repetitive, tedious, frustrated,
broken, annoying, slow, overpriced
```

### Real demand keywords (willingness-to-pay)

```
I'd pay for, shut up and take my money, is there a tool that,
looking for a solution, willing to pay, I need something that,
does anyone know a tool, recommendation for, take my money,
would pay good money
```

### Output per post

```json
{ 
"source": "reddit", 
"subreddit": "r/smallbusiness", 
"title": "...", 
"body": "...", 
score: 42, 
"num_comments": 15, 
"comments": ["...", "..."], 
"url": "...", 
"created_utc": "2026-05-20T14:30:00Z",

"pain_signals": ["expensive", "manual"],

"demand_signals": ["I'd pay for"]
}
```

### Error Handling

- Rate limit / blocking Reddit: retry with exponential backoff (max 3 attempts) + configurable delay
- If it fails completely: scan continues with the other sources, Reddit is marked as "no data"

### Storage

Result saved in collection `raw_data` with `source = "reddit"`, linked to `scan_id`.


## Acceptance Criteria

- [x] Scrapes Reddit via Playwright without requiring API credentials
- [x] Searches configured subreddits
- [x] Detects pain signals and demand signals in titles, bodies, and comments
- [x] Generates structured output per post
- [x] Saves results in `raw_data`
- [x] Retry with backoff at rate limit
- [x] Works as an asynchronous task within the scan pipeline

## Dependencies

- F03 (backend core, scan service)
- F02 (collection raw_data)

## Ref SPEC

Section 5.1.1