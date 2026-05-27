# F02 - Database Schema (PocketBase)

## Objective

Create PocketBase collections with their fields, relationships, and indexes.

## Scope

### Auth

Single admin user created in initial setup (`./pocketbase superuser create email password`). There is no `users` collection with multiple rows, no public registration, and no password reset via email.

### Collection: scans

| Field | Type | Notes |

| ----------------- | ------ | -------------------------------------- |

| id | text | PK |

| status | select | pending / collecting / processing / awaiting_llm_input / parsing / completed / failed |

| config | json | scan configuration |

| prompt_text | text | generated prompt |

| prompt_tokens_est | number | token estimate |

| llm_response_raw | text | raw pasted response |

| llm_used | text | optional tag ("Claude Opus 4.7") |
| started_at | date | |
| processed_at | date | when the processor finishes |
| submitted_at | date | when the answer was pasted |
| completed_at | date | |
| error_message | text | |

### Collection: opportunities

| Field | Type | Notes |
| ------------ | -------- | ------------------------------------------- |
| id | text | PK |
| scan | relationship | --> scans (cascade delete) |
| rank | number | |
| score | number | 1.0 - 10.0 |
| name | text | |
| problem | text | |
| evidence | json | |
| scoring | json | 4 criteria (pain, trend, competition, MVP) |
| target_user | text | |
| mvp_features | json | |
| monetization | text | |
| build_time | text | |
| reasoning | text | |
| user_status | select | new / evaluating / discarded / building / archived |
| notes | text | personal notes about the idea |
| created | autodate | |

### Collection: raw_data

| Field | Type | Notes |
| ------------ | -------- | ------------------------------------------- |
| id | text | PK |
| scan | relationship | --> scans (cascade delete) |
| source | select | reddit / hackernews / trends / producthunt |
| data | json | raw payload |
| collected_at | autodate | |

### Collection: scan_configs

| Field | Type |
| ---------- | -------- |
| id | text |
| name | text |
| config | json |
| is_default | bool |
| created | autodate |

### Indexes

```
scans: (status), (created)
opportunities: (scan), (user_status), (score DESC)
raw_data: (scan, source)
```

No `user` column in any collection.

> **Implementation Note:** The `prompt_text` and `llm_response_raw` fields have their character limits increased to 2,000,000 via migration `3_increase_text_limits.js` (PocketBase v0.38 limits text fields to 5,000 characters by default).

## Acceptance Criteria

- [x] All 4 collections exist in PocketBase with correct fields
- [x] Scan --> opportunities and scan --> raw_data relationships with cascade delete work
- [x] Indexes created
- [x] Admin user created and functional
- [x] Reproducible migration script or automated setup

## Dependencies

- F01 (PocketBase running)

## Ref SPEC

Section 6