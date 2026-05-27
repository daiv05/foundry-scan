# F15 - Report & Export

## Objective

View the final report of a scan with ranked opportunities and export to Markdown.

## Scope

### Page: /scan/[id]/report

Summary view of the completed scan:

- List of opportunities sorted by rank/score
- OpportunityCard for each opportunity with quick access to details
- Scan metadata: date, LLM used, total time, number of opportunities
- Link to original prompt and raw response

### Export Markdown

`GET /api/scans/{id}/export/markdown`

Generates a `.md` file with:

- Title and date of the scan
- Summary table of opportunities (rank, score, name, problem)
- Details per opportunity: scoring, target user, MVP features, monetization, build time, rationale
- Scan metadata

### Export Prompt

`GET /api/scans/{id}/export/prompt.txt`

Downloads the generated prompt as a `.txt` file.

## Acceptance Criteria

- [x] Report displays ranked opportunities with scores
- [x] Scan metadata is visible
- [x] Export Markdown generates a complete and readable .md file
- [x] Export prompt downloads a .txt file
- [x] Download buttons are included in the report UI

## Dependencies

- F11 (routing)
- F13 (scan flow - reaches the report after completion)
- F03 (export endpoints)
- F10 (opportunities in the database)

## Ref SPEC

Section 8.1 (path /scan/[id]/report), section 7.1 (export endpoints)