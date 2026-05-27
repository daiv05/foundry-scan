# F10 - Response Parser

## Objective

Receive the raw LLM response pasted by the user and convert it into structured opportunities.

## Scope

### Parsing Pipeline

1. **Extract JSON block:** search for `json ... `; 1. Fallback: First balanced `{ ... }`
2. **Fix malformed JSON:** trailing commas, single quotes, comments `//`
3. **Validate schema** with Pydantic
4. **Validate values:** scores in [1, 10], unique rank, required fields
5. **Recalculate weighted score** in the backend (do not rely on the LLM total)

- Weights: pain 30%, trend 20%, competition 25%, MVP 25%

6. **Insert opportunities** linked to the `scan_id`

### Input

````json
{
  "response_text": "```json\n{ \"opportunities\": [...] }\n```",
  "llm_used": "Claude Opus 4.7"
}
````

### Error Handling

| Error                           | Action                                    |
| ------------------------------- | ----------------------------------------- |
| JSON block not found            | Show formatting instructions + retry      |
| Invalid JSON                    | Attempt repair; if it fails, retry        |
| Invalid schema (missing fields) | Show diff of what's missing + retry       |
| Score out of range              | Auto-clamp to [1, 10] + warning displayed |
| Zero attempts                   | Ask for confirmation before saving        |

### Assisted Mode

If parsing fails, offer a JSON editor with live validation (the frontend displays it, see F13).

### Storage

- `scan.llm_response_raw` = raw response
- `scan.llm_used` = LLM label
- `scan.submitted_at` = timestamp
- `scan.status` = `parsing` --> `completed`
- Opportunities inserted into collection `opportunities`

### Endpoint retry

`POST /api/scans/{id}/response/retry` reprocesses the same saved raw response, useful if it was manually corrected.

## Acceptance Criteria

- [x] Extracts JSON from ``json` and from balanced `{ }`
- [x] Fixes trailing commas, single quotes, and comments
- [x] Validates schema with Pydantic
- [x] Clamps out-of-range scores and generates a warning
- [x] Recalculates weighted score (does not use the LLM score)
- [x] Inserts opportunities into PocketBase
- [x] Updates scan status to `completed`
- [x] Retry works by reprocessing the saved response
- [x] Errors return clear and actionable messages

## Dependencies

- F03 (response endpoints)
- F02 (collections scans and opportunities)

## Ref SPEC

Section 5.4
