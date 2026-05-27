# F05 - Hacker News Collector

## Objective

Collect Hacker News posts relevant to micro-SaaS opportunities.

## Scope

### API

Hyper News (Firebase) public API. No authentication required.

### Sources

- Top stories
- New stories
- Ask HN
- Show HN

### Filters

- Posts with 5+ points
- Related to SaaS, automation, tools, productivity
- Ask HN has extra weight (2x in signal detection, defined in F08)

### Output per post

```json
{
"source": "hackernews",

"title": "...",

"url": "...",

"score": 85,

"num_comments": 23,

"comments": ["...", "..."],

"created_utc": "...",

"type": "ask_hn",

"pain_signals": [...],

"demand_signals": [...]
}
```

### Error Handling

- Public API without aggressive rate limit
- If it fails: scan continues with the other sources, HN is marked as "without" Data

### Storage

Result in `raw_data` with `source = "hackernews"`.

## Acceptance Criteria

- [x] Consumes HN's public API
- [x] Filters by score >= 5 and relevance
- [x] Distinguishes post type (ask_hn, show_hn, story)
- [x] Generates structured output
- [x] Saves to `raw_data`
- [x] Works as an asynchronous task

## Dependencies

- F03 (backend core)
- F02 (collection raw_data)

## Ref SPEC

Section 5.1.2