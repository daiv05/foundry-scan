# F12 - Dashboard

## Objective

Homepage displaying a quick summary: recent scans, top opportunities, and access to a new scan.

## Scope

### Content

- **Recent Scans:** list with status, date, and number of opportunities found
- **Top Opportunities:** the best recent opportunities (by score)
- **"New Scan"" Button:** which leads to `/scan/new`
- **Persistent Notification:** if a scan is in `awaiting_llm_input` status: "Your weekly scan is ready. Paste it into your LLM to continue."

### Data

- `GET /api/scans` (recent scans)
- `GET /api/opportunities` (top opportunities by score)

### Components

- List of scans with status badge
- OpportunityCard (name, score with color badge, problem summary)
- Notification of pending scans

## Acceptance Criteria

- [x] Shows recent scans with status
- [x] Shows top opportunities with score
- [x] Button to new scan
- [x] Notification visible if there is a scan in `awaiting_llm_input`
- [x] Empty state (first use) with clear CTA

## Dependencies

- F11 (shell and routing)
- F03 (endpoints for scans and opportunities)

## Ref SPEC

Section 8.1 (route `/`), section 10 (notification)