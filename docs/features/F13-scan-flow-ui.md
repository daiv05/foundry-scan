# F13 - Scan Flow UI

## Objective

Implement the complete UI flow for a scan: configure, launch, view progress, copy prompt, paste response.

## Scope

### Flow

```
[1] /scan/new --> Configure and launch
[2] /scan/[id] --> ScanProgress: collecting --> processing
[3] /scan/[id]/prompt --> PromptViewer: copy prompt
[4] /scan/[id]/response --> ResponsePaste: paste response
[5] /scan/[id]/report Final report (see F15)
```

### Page: /scan/new

- Subreddit selection (checkboxes, active by default)
- Extra keywords (optional)
- "Launch Scan" button
- `POST /api/scans` and redirect to `/scan/[id]`

### Component: ScanProgress

Progress bar with states: `collecting --> processing awaiting_llm_input parsing completed

Polling or real-time (PocketBase real-time) to automatically update status.

### Page: /scan/[id]/prompt - PromptViewer

- Code block with the complete prompt
- **"Copy to clipboard"** button
- Estimated token counter with color badge (green <8K, yellow <32K, orange <100K, red >100K)
- Table of recommended models by size
- Download button for `.txt` file
- Quick links to claude.ai, chatgpt.com, gemini.google.com
- Instructions: "1. Copy. 2. Paste into your LLM. 3. Return here with the answer."

### Page: /scan/[id]/response - ResponsePaster

- Large textarea for pasting
- Automatic detection of JSON blocks on pasting (green checkmark / red X)
- Live preview of the detected JSON
- Optional selector: "Which LLM did you use?" (dropdown)
- **"Parse & Save"** button
- If parsing fails: inline JSON editor mode with live validation
- Errors displayed with clear messages (from F10)

## Acceptance Criteria

- [x] You can configure and launch a scan from `/scan/new`
- [x] ScanProgress updates status in real time (polling every 3s)
- [x] PromptViewer displays prompt with functional copy-to-clipboard
- [x] Token estimation with color badge
- [x] Download prompt as .txt
- [x] ResponsePaster detects JSON on paste
- [x] Live validation preview
- [x] Parse & Save sends to backend and redirects to report
- [x] Inline JSON editor if parsing fails (editable textarea with re-submit; no advanced syntax highlighting)

## Dependencies

- F11 (shell and routing)
- F03 (scans endpoints, prompt, response)
- F09 (prompt generated)
- F10 (response parser)

## Ref SPEC

Sections 8.2, 8.3