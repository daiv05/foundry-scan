# F03 - Backend Core & API Structure

## Objective

Establish the structure of the FastAPI backend, connection to PocketBase, middleware, and all REST endpoints (initial stubs).

## Scope

### Backend structure

```
backend/
├── app/
│ ├── main.py # FastAPI app, middleware, lifespan
│ ├── config.py # Settings from env vars
│ ├── db.py # PocketBase SDK client
│ ├── routers/
│ │ ├── scans.py # /api/scans/*
│ │ ├── opportunities.py # /api/opportunities/*
│ │ └── configs.py # /api/configs/*
│ ├── services/
│ │ ├── scan_service.py # Pipeline orchestration
│ │ ├── collector/ # (F04-F07)
│ │ ├── processor.py # (F08)
│ │ ├── prompt_builder.py # (F09)
│ │ └── response_parser.py # (F10)
│ └── models/
│ └── schemas.py # Pydantic models
├── requirements.txt
├── Dockerfile
└── .env
```

### PocketBase Connection

Backend uses credentials admin user (env vars `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`) to authenticate against PocketBase server-side via your Python SDK.

### Optional middleware

Validate header `Cf-Access-Authenticated-User-Email` in production. In dev, skip.

### Endpoints (stubs)

#### Scans

| Method | Route | Description |
| ------ | --------------------------- | ------------------------------------- |
| POST | /api/scans | Create and launch scan |
| GET | /api/scans | List scans |
| GET | /api/scans/{id} | Scan detail |
| GET | /api/scans/{id}/status | Current status |
| DELETE | /api/scans/{id} | Delete scan and associated data |

#### Prompt and Response

| Method | Path | Description |
| ------ | ------------------------------ | ------------------------------------- |
| GET | /api/scans/{id}/prompt | Prompt ready to copy |
| POST | /api/scans/{id}/response | Receive pasted response |
| POST | /api/scans/{id}/response/retry | Retry parsing |
| GET | /api/scans/{id}/response/raw | View saved raw response |

#### Opportunities

| Method | Path | Description |
| ------ | ------------------------------ | ------------------------------------- |
| GET | /api/scans/{id}/opportunities | Scan opportunities |
| GET | /api/opportunities | All Opportunities |
| GET | /api/opportunities/{id} | Opportunity Details |
| PATCH | /api/opportunities/{id} | Update Status or Notes |
| GET | /api/opportunities/new | New vs. Previous Scans |

#### Configs and Export

| Method | Path | Description |
| ------ | ---------------------------------- | ------------------------ |
| POST | /api/configs | Save Template |
| GET | /api/configs | List Templates |
| PUT | /api/configs/{id} | Update |
| DELETE | /api/configs/{id} | Delete |
| GET | /api/scans/{id}/export/markdown | Export MD Report |
| GET | /api/scans/{id}/export/prompt.txt | Download prompt .txt |

### Pydantic Models

- `ScanCreate`, `ScanResponse`, `ScanStatus`
- `OpportunityResponse`, `OpportunityUpdate`
- `LLMResponseInput` (`response_text`, `llm_used`)
- `ScanConfigCreate`, `ScanConfigResponse`

## Acceptance Criteria

- [x] FastAPI starts and all endpoints respond (stubs with 501 or mock data)
- [x] Functional connection to PocketBase (basic CRUD)
- [x] Pydantic models define clear contracts
- [x] `POST /api/scans` creates a record in PocketBase with the status `pending`

## Dependencies

- F01 (services running)
- F02 (collections created)

## Ref SPEC

Section 7