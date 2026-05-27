# F17 - Error Handling & Resilience

## Objective

Robust error handling throughout the pipeline, including retries, fallbacks, timeouts, and stale data expiration.

## Scope (adjusted)

Several points from the original spec were already implemented in F04-F10. This feature fills the actual gaps identified during review.

### Status by Scenario

| Scenario | Behavior | Status |

|---|---|---|

| Reddit rate limit | Retry with exponential backoff (max 3, 30/60/120 s) | ✅ reddit.py |

| PyTrends fails | Automatic fallback to Playwright scraper | ✅ trends.py |

| Individual source fails | Scan continues; source marked in logs | ✅ scan_service.py |

| Scan exceeds 10 min in collect | `asyncio.wait_for(timeout=600)` --> status=`failed` | ✅ F17 |

| raw_data stale > 30 days | cleanup_service removes raw_data (prompt intact) | ✅ F17 |

| LLM response not parsable | 422 + manual editor; /retry re-parse | ✅ F10 |

| React page error | error.tsx by segment with RETRY button | ✅ F17 |

| Path does not exist | not-found.tsx (404) with link to dashboard | ✅ F17 |

### Principles

- **Gracious Degradation:** If one source fails, the scan continues with the others.

- **Global Timeout:** 10 minutes for the collecting phase. If exceeded --> `status=failed`.

- **Exponential Backoff:** Reddit (already implemented in F04).

- **Visible Errors:** Readable messages in the UI; never silent errors.

- **Automatic Expiration:** Raw_data deleted after 30 days in `awaiting_llm_input`.

### Scan failed state

- `scan.status = "failed"`
- `scan.error_message` with readable description
- UI displays error in red with option to rescan

### Raw_data cleanup

- `cleanup_service.run_periodic_cleanup()` runs in the background when the backend starts
- Every 24 hours, checks for scans in `awaiting_llm_input` with `created` > 30 days old
- Deletes associated `raw_data` records (the `prompt_text` remains)

## Files modified / created

### Backend
- `backend/app/services/scan_service.py` - `asyncio.wait_for(timeout=600)` in collecting
- `backend/app/services/cleanup_service.py` - **NEW** - expiration logic
- `backend/app/main.py` - `asyncio.create_task(run_periodic_cleanup())` in lifespan

### Frontend
- `frontend/src/app/error.tsx` - **NEW** - root error boundary
- `frontend/src/app/not-found.tsx` - **NEW** - 404 page
- `frontend/src/app/scan/[id]/error.tsx` - **NEW** - scan segment error boundary
- `frontend/src/app/opportunities/[id]/error.tsx` - **NEW** - opportunity segment error boundary

## Acceptance Criteria

- [x] Reddit retry with backoff works (F04)
- [x] PyTrends --> Playwright fallback works (F06)
- [x] Failed sources are correctly marked, do not break the scan
- [x] 10 min timeout on collecting
- [x] Error Readable messages in scan failed
- [x] UI displays errors with retry option
- [x] raw_data expires after 30 days without completion

## Dependencies

- F04-F07 (collectors)
- F10 (response parser errors)
- F03 (scan status management)

## Ref SPEC

Sections 10 (expiration), 11 (errors)