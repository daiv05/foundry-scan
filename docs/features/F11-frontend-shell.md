# F11 - Frontend Shell & Layout

## Objective

Establish the basic structure of the Next.js frontend: layout, navigation, routing, and shared components.

## Scope

### Pages (routes)

| Route               | Page           | Description                                     |
| ------------------- | -------------- | ----------------------------------------------- |
| /                   | Dashboard      | Recent scans, top opportunities                 |
| /scan/new           | New Scan       | Configure and launch                            |
| /scan/[id]          | Scan Details   | Progress, prompt, or report depending on status |
| /scan/[id]/prompt   | Prompt Viewer  | Prompt ready to copy                            |
| /scan/[id]/response | Response Paste | Textarea to paste response                      |
| /scan/[id]/report   | Report         | Final report                                    |
| /opportunities      | Listing        | Filters and statuses                            |
| /opportunities/[id] | Details        | Details + personal notes                        |
| /settings           | Configuration  | API keys, templates                             |

**There is no `/login` or `/signup`.** Cloudflare Access handles authentication before the app loads.

### Layout

- Sidebar or top navigation with links to Dashboard, Opportunities, and Settings
- No frontend authentication/session system

### Technology

- Next.js (App Router)
- Tailwind CSS for styling
- Fetch `/api/*` (rewrite to backend via next.config.js)

## Acceptance Criteria

- [x] All routes exist (can be empty/placeholder)
- [x] Layout with functional navigation
- [x] Tailwind CSS configured
- [x] Fetch `/api/health` works from the frontend

## Dependencies

- F01 (frontend running)

## Ref SPEC

Section 8.1
