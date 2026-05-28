# FoundryScan - Technical Specification

---

## 1. Product Vision

A personal tool that automates the process of discovering micro-SaaS niches with real evidence, avoiding classic risks: generic ideas, lack of data, and unsupported intuition.

Expected user flow:

1. Launch a scan occasionally (weekly, monthly, when free time appears).
2. The app collects and processes data automatically (~3 minutes).
3. Copy the generated prompt into Claude/ChatGPT from a personal account.
4. Paste the response back into the app.
5. Review the report, marking interesting ideas as "evaluating" or "building".
6. If an idea passes the personal filter --> build the real SaaS (separate project).

---

## 2. Target User

**A single user: the app owner.**

There is no multi-user functionality, no invitations, no subscription plans, and no billing. Any complexity related to this is out of scope.

---

## 3. General Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                         Machine                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            FRONTEND (Next.js  :7110)             │    │
│  │  Dashboard / Config / Prompt / Response / Report │    │
│  └─────────────────────┬────────────────────────────┘    │
│                        │ REST /api/*                     │
│  ┌─────────────────────▼─────────────────────────────┐   │
│  │         BACKEND (Python / FastAPI  :7120)         │   │
│  │                                                   │   │
│  │  Collector --> Processor --> PromptBuilder        │   │
│  │                                ↓                  │   │
│  │                       [manual external LLM]       │   │
│  │                                ↓                  │   │
│  │                         ResponseParser            │   │
│  └─────────────────────┬─────────────────────────────┘   │
│                        │                                 │
│  ┌─────────────────────▼─────────────────────────────┐   │
│  │        PocketBase (SQLite  :7130)                 │   │
│  │  scans / opportunities / raw_data / configs       │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

```

The scan is "paused" between `PromptBuilder` and `ResponseParser` while the user interacts with the external LLM in another tab.

---

## 4. Tech Stack

| Layer      | Technology                     | Justification                        |
| ---------- | ------------------------------ | ------------------------------------ |
| Frontend   | Next.js 16 + Tailwind CSS v4   | Modern UI, fast development          |
| Backend    | Python 3.11+ / FastAPI         | Data and scraping ecosystem          |
| Database   | PocketBase (SQLite)            | Single binary, no external services  |
| LLM        | **Manual** (Claude/ChatGPT)    | No API key, uses personal account    |
| Scheduling | asyncio background task        | Internal backend cleanup             |
| Clustering | scikit-learn                   | TF-IDF + Local KMeans                |
| Reddit     | Playwright (scraping)          | No credentials, `old.reddit.com`     |
| Trends     | PyTrends + Playwright fallback | Google Trends without SerpAPI        |
| Container  | Docker Compose                 | A single `docker compose up`         |
| Design     | RawBlock (brutalist)           | Black / Work Sans / Space Mono fonts |

**Does not include:** Vercel, Railway, public hosting, user registration, payment systems, transactional emails, Cloudflare Tunnel/Access.

---

## 5. Backend Modules

### 5.1 Collector Module

Collects raw data from external sources.

#### 5.1.1 Reddit Collector

- **Library:** Playwright (scraping `old.reddit.com`, without API credentials).
- **Rate limiting:** Configurable delay between requests + exponential backoff (max 3 retries, 30/60/120 s) upon rate-limit.
- **Default subreddits:** r/SaaS, r/Entrepreneur, r/smallbusiness, r/freelance, r/webdev.
- **Configurable subreddits** from the app (Settings --> Scan Defaults).

**Pain keywords:**

```text
pain, workflow, manual, expensive, spreadsheet, automation,
hate this tool, waste time, repetitive, tedious, frustrated,
broken, annoying, slow, overpriced
```

**Real demand keywords (willingness-to-pay):**

```text
I'd pay for, shut up and take my money, is there a tool that,
looking for a solution, willing to pay, I need something that,
does anyone know a tool, recommendation for, take my money,
would pay good money
```

**Output per post:**

```json
{
  "source": "reddit",
  "subreddit": "r/smallbusiness",
  "title": "...",
  "body": "...",
  "score": 42,
  "num_comments": 15,
  "comments": ["...", "..."],
  "url": "...",
  "created_utc": "2026-05-20T14:30:00Z",
  "pain_signals": ["expensive", "manual"],
  "demand_signals": ["I'd pay for"]
}
```

#### 5.1.2 Hacker News Collector

- Public API, no authentication.
- Top stories, New stories, Ask HN, Show HN.
- Filter: posts with 5+ points related to SaaS, automation.

#### 5.1.3 Trends Collector

- **Primary:** PyTrends (unofficial Google Trends Python client, without credentials).
- **Fallback:** Playwright scraping of `trends.google.com/trending` if PyTrends fails.
- If both fail: scan continues without trends data (source marked "none").

#### 5.1.4 Product Hunt Collector

- GraphQL API with OAuth (`PRODUCTHUNT_TOKEN` in `.env`).
- Role: strictly for competition and saturation filtering.
- If the token is not configured: skipped without breaking the scan.

---

### 5.2 Processor Module

Transforms raw data into clean input for the external LLM.

#### 5.2.1 Cleaning

- Posts with fewer than 10 words: discarded.
- Spam (excessive links, self-promotion): discarded.
- Text normalization.
- Deduplication of similar posts (cosine similarity ≥ 0.85).

#### 5.2.2 Clustering

- TF-IDF + KMeans (scikit-learn).
- Number of clusters: automatic via silhouette score, between **3-15** (K_MIN=3, K_MAX=15).

#### 5.2.3 Signal Detection

| Type            | Weight |
| --------------- | ------ |
| Pain signal     | 1x     |
| Demand signal   | 3x     |
| High engagement | 1.5x   |
| Ask HN post     | 2x     |

#### 5.2.4 Summaries per cluster

1-2 paragraphs per cluster: theme, counts, signals, representative phrases (without copying full posts).

---

### 5.3 PromptBuilder Module

Builds a complete, self-contained prompt ready to paste into any external LLM.

#### 5.3.1 Responsibilities

- Take processed clusters + validation data.
- Generate a prompt with strict JSON response format instructions.
- Estimate tokens and warn if it exceeds common limits.
- Cap the prompt to a safe maximum if it is too large.

#### 5.3.2 Generated Prompt Structure

````text
=== CONTEXT ===
You are a market analyst specializing in micro-SaaS.
You will receive processed data from Reddit, Hacker News, Google Trends
and Product Hunt about potential niches.

=== DATA ===
[clusters with summary, post_count, demand_signals, pain_signals,
 trend_data, competition]

=== INSTRUCTIONS ===
For each opportunity generate:
- name, problem, evidence with numbers
- scoring 1-10 on 4 criteria (pain 30%, trend 20%, competition 25%, MVP 25%)
- total weighted score
- target user, MVP features, monetization, build time
- reasoning

Filter: discard generic AI chatbots, AI wrappers, AI note apps,
AI coding assistants, "Uber for X" style ideas without evidence.

=== RESPONSE FORMAT (CRITICAL) ===
Respond EXCLUSIVELY with a valid JSON block inside ```json
with the exact following structure:

```json
{
  "opportunities": [
    {
      "rank": 1,
      "score": 8.2,
      "name": "...",
      "problem": "...",
      "evidence": { ... },
      "scoring": {
        "pain_frequency": 8,
        "trend_growth": 9,
        "low_competition": 8,
        "mvp_feasibility": 8
      },
      "target_user": "...",
      "mvp_features": [ ... ],
      "monetization": "...",
      "build_time_estimate": "...",
      "why_it_could_work": "..."
    }
  ]
}
````

```

Do not include text outside the JSON block. Do not add comments.

```

#### 5.3.3 Token Estimation

| Prompt Size | Recommended Model                     |
| ----------- | ------------------------------------- |
| < 8K tokens | Any modern LLM                        |
| 8K - 32K    | Claude Sonnet/Opus, GPT-4, Gemini Pro |
| 32K - 100K  | Claude (any), Gemini 1.5+             |
| > 100K      | Warn the user; clusters are truncated |

---

### 5.4 ResponseParser Module

Receives the pasted response and converts it into structured opportunities.

#### 5.4.1 Parsing Pipeline

1. Extract JSON block ` ```json ... ``` ` ; fallback: first balanced `{ ... }`
2. Repair malformed JSON (trailing commas, single quotes, comments `//`)
3. Validate schema with Pydantic
4. Validate values: scores in [1, 10], unique rank, required fields
5. **Recalculate weighted score in backend** (do not rely on the total sent by the LLM)
6. Insert opportunities linked to `scan_id`

#### 5.4.2 Error Handling

| Error                           | Action                               |
| ------------------------------- | ------------------------------------ |
| JSON block not found            | Show formatting instructions + retry |
| Invalid JSON                    | Attempt repair; if it fails, retry   |
| Invalid schema (missing fields) | Show diff of missing fields + retry  |

Score out of range | Auto-clamp to [1, 10] + visible warning |

Zero attempts | Prompt for confirmation before saving |

#### 5.4.3 Assisted Mode

If parsing fails, offer a JSON editor with live validation and the `/retry` endpoint.

---

## 6. Database (PocketBase / SQLite)

### 6.1 Auth: Unique admin

**Only one option:** Fixed administrator user created in initial setup:

```bash
./pocketbase superuser create admin@alcsaas.dev <password>
```

The FastAPI backend uses these credentials to communicate with PocketBase server-side (via `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`).

There is no `users` collection. There is no public registry. Password reset via email is not available.

### 6.2 Collection: scans

| Field | Type | Notes |

| ------------------- | --------- | ----------------------------------------- |

| id | text | PK |

| status | select | see statuses below |

| config | json | scan configuration |

| prompt_text | text | max 2M characters - generated prompt |
| prompt_tokens_est | number | token estimation |
| llm_response_raw | text | max 2M chars - pasted raw response |
| llm_used | text | optional tag ("Claude Opus 4.7") |
| started_at | date | |
| processed_at | date | when the processor finishes |
| submitted_at | date | when the answer was pasted |
| completed_at | date | |
| error_message | text | |

**States:** `pending` | `collecting` | `processing` | `awaiting_llm_input` | `parsing` | `completed` | `failed`

### 6.3 Collection: opportunities

| Field        | Type         | Notes                                              |
| ------------ | ------------ | -------------------------------------------------- |
| id           | text         | PK                                                 |
| scan         | relationship | --> scans (cascade delete)                         |
| rank         | number       |                                                    |
| score        | number       | 1.0 - 10.0                                         |
| name         | text         |                                                    |
| problem      | text         |                                                    |
| evidence     | json         |                                                    |
| scoring      | json         | 4 criteria                                         |
| target_user  | text         |                                                    |
| mvp_features | json         |                                                    |
| monetization | text         |                                                    |
| build_time   | text         |                                                    |
| reasoning    | text         |                                                    |
| user_status  | select       | new / evaluating / discarded / building / archived |
| notes        | text         | personal notes about the idea                      |
| created      | autodate     |                                                    |

### 6.4 Collection: raw_data

| Field        | Type         | Notes                                      |
| ------------ | ------------ | ------------------------------------------ |
| id           | text         | PK                                         |
| scan         | relationship | --> scans (cascade delete)                 |
| source       | select       | reddit / hackernews / trends / producthunt |
| data         | json         | raw payload                                |
| collected_at | autodate     |                                            |

### 6.5 Collection: scan_configs

Reusable configuration templates (default subreddits, etc.).

| Field      | Type     |
| ---------- | -------- |
| id         | text     |
| name       | text     |
| config     | json     |
| is_default | bool     |
| created    | autodate |

### 6.6 Indices

```
scans: (status), (created)
opportunities: (scan), (user_status), (score DESC)
raw_data: (scan, source)
```

No `user` column in any collection: the app is a single user.

---

## 7. REST API (FastAPI over PocketBase)

The FastAPI backend orchestrates the pipeline. For simple CRUD, it uses the PocketBase SDK with admin user credentials. For complex operations, it exposes its own endpoints.

### 7.1 Endpoints

#### Scans

| Method | Route                  | Description                           |
| ------ | ---------------------- | ------------------------------------- |
| POST   | /api/scans             | Create and launch (collect + process) |
| GET    | /api/scans             | List scans                            |
| GET    | /api/scans/{id}        | Details                               |
| GET    | /api/scans/{id}/status | Current status                        |
| DELETE | /api/scans/{id}        | Delete scan and associated data       |

#### Prompt and Manual Response

| Method | Route                          | Description                       |
| ------ | ------------------------------ | --------------------------------- |
| GET    | /api/scans/{id}/prompt         | Returns the prompt ready to copy  |
| POST   | /api/scans/{id}/response       | Receives the pasted response      |
| POST   | /api/scans/{id}/response/retry | Retry parsing with saved response |
| GET    | /api/scans/{id}/response/raw   | View saved raw response           |

**Request POST /api/scans/{id}/response:**

````json
{
  "response_text": "```json\n{ \"opportunities\": [...] }\n```",
  "llm_used": "Claude Opus 4.7"
}
````

#### Opportunities

| Method | Path                          | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| GET    | /api/scans/{id}/opportunities | Opportunities from a scan      |
| GET    | /api/opportunities            | All opportunities (filterable) |
| GET    | /api/opportunities/{id}       | Opportunity details            |
| PATCH  | /api/opportunities/{id}       | Update status or notes         |

#### Configs, Settings, and Export

| Method | Path                              | Description                            |
| ------ | --------------------------------- | -------------------------------------- |
| POST   | /api/configs                      | Save template                          |
| GET    | /api/configs                      | List templates                         |
| PUT    | /api/configs/{id}                 | Update                                 |
| DELETE | /api/configs/{id}                 | Delete                                 |
| GET    | /api/settings/status              | Source and environment variable status |
| GET    | /api/scans/{id}/export/markdown   | Export MD report                       |
| GET    | /api/scans/{id}/export/prompt.txt | Download prompt .txt                   |

### 7.2 Authentication

There is no app authentication: the tool is for local use. The backend accepts requests from any source on the local network.

**Backend ↔ PocketBase:** Admin user credentials in environment variables (`PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`).

---

## 8. Frontend (Next.js)

### 8.1 Pages

| Path                | Page               | Description                                      |
| ------------------- | ------------------ | ------------------------------------------------ |
| /                   | **Dashboard**      | Recent Scans, Top Opportunities                  |
| /scan/new           | New Scan           | Configure Sources and Launch                     |
| /scan/[id]          | Scan Details       | Progress with Real-Time Steps                    |
| /scan/[id]/prompt   | **Prompt Viewer**  | Prompt Ready to Copy                             |
| /scan/[id]/response | **Response Paste** | Text Area to Paste Response                      |
| /scan/[id]/report   | Report             | Ranked Opportunities from the Scan               |
| /opportunities      | List               | Filters by Status and Minimum Score              |
| /opportunities/[id] | Details            | Details + Scoring + Personal Notes               |
| /settings           | Settings           | Source Status, Environment Variables, Subreddits |

**There is no `/login` or `/signup`.** The home page (`/`) is directly the dashboard.

### 8.2 Key Components

**ScanProgress** - visual steps: collecting --> processing awaiting input parsing completed

**PromptViewer**:

- Code block with the complete prompt
- **"Copy to clipboard"** button
- Estimated token counter with color badge
- Table of recommended models by size
- Download button (`.txt`)
- Quick links to claude.ai/new, chatgpt.com, gemini.google.com
- Instructions: "1. Copy. 2. Paste into your LLM. 3. Return here with the answer."

**ResponsePaster**:

- Large text area
- Automatic JSON block detection upon pasting
- Live preview of detected JSON (green checkmark / red X)
- Optional selector: "Which LLM did you use?"

- **"Parse & Save"** button
- Inline editor mode if parsing fails

**OpportunityCard** - Name, score (color badge), problem, evidence tags, status chip.

**ScoreBadge / ScoreBar** - Traffic light: green ≥8, yellow ≥5, red <5.

**StatusChip** - Active / Warning / Error / Default.

**NotesPanel** - Personal notes field for each opportunity.

### 8.3 Design System (RawBlock)

Brutalist style: no border radius, no shadows, thick borders (3-5px). Semantic tokens for dark mode.

| Token      | Light   | Dark    |
| ---------- | ------- | ------- |
| rb-fg      | #000000 | #FFFFFF |
| rb-bg      | #FFFFFF | #000000 |
| rb-sunken  | #F0F0F0 | #1A1A1A |
| rb-success | #008000 | #008000 |
| rb-warning | #FFA500 | #FFA500 |
| rb-error   | #FF0000 | #FF0000 |
| rb-link    | #0000FF | #0000FF |

Dark mode via class `.dark` in `<html>`, persisted in `localStorage`.

### 8.4 Full Scan UX

```
[1] Launch scan from /scan/new
      |
      ▼
[2] ScanProgress in /scan/[id]: collecting --> processing
      |
      ▼ (polling every 3s)
[3] PromptViewer: "Your prompt is ready. Paste it into your LLM."
        |
        ▼ "I have a response"
        |
        ▼
[4] ResponsePaste: paste response from LLM
        |
        ▼ "Parse & Save"
        |
        ▼
[5] /scan/[id]/report with ranked opportunities
```

---

## 9. Scan execution pipeline

```
[Launch scan]
│
▼
scan.status = 'collecting' ← timeout 10 min
│
├── Reddit Collector (async, Playwright)
├── HN Collector (async, public API)
├── Trends Collector (async, PyTrends --> Playwright fallback)
└── PH Collector (async, GraphQL)
│
▼
scan.status = 'processing'
│
├── Cleaning + cosine deduplication
├── Clustering (TF-IDF + KMeans, 3-15 clusters)
├── Signal Detection
└── Cluster Summaries
│
▼
PromptBuilder generates prompt
scan.status = 'awaiting_llm_input'
│
▼
[PAUSE - external user working in LLM]
│
▼
POST /api/scans/{id}/response
scan.status = 'parsing'
│
├── Extract + Repair JSON
├── Validate Schema
├── Recalculate Scores
└── Insert Opportunities
│
▼
scan.status = 'completed'
```

Expected times:

- Collecting + processing: **2-4 minutes**
- User wait: **Variable** (minutes to days)
- Parsing: **< 5 seconds**

---

## 10. Scheduled Scans

> **Not implemented in MVP.** Future functionality.

APScheduler in the backend would trigger scans at configurable times (e.g., Monday at 9 AM). The pipeline would run automatically until `awaiting_llm_input`. The dashboard would display a persistent notification.

If **30 days** pass without the user completing the scan at `awaiting_llm_input`, the `raw_data` is automatically deleted via `cleanup_service` (the prompt remains accessible).

---

## 11. Error Handling

| Scenario                       | Behavior                                                |
| ------------------------------ | ------------------------------------------------------- |
| Reddit rate limit              | Retry with exponential backoff (max 3, 30/60/120 s)     |
| PyTrends fails                 | Automatic fallback to Playwright scraper                |
| Playwright fallback fails      | Skip trends, scan continues with other sources          |
| Product Hunt token missing     | Skip, scan continues without competitor data            |
| Single source fails            | Non-fatal, scan continues with available sources        |
| Scan exceeds 10 min in collect | `asyncio.wait_for` timeout --> status = `failed`        |
| Prompt too large (>100K)       | Less relevant clusters are automatically truncated      |
| LLM response not parsable      | 422 + JSON editor; scan remains in `awaiting_llm_input` |
| Text without JSON              | Formatting instructions + retry button                  |
| React page error               | `error.tsx` per segment with RETRY button               |
| Path not found                 | `not-found.tsx` with link to dashboard                  |
| raw_data > 30 days stashed     | `cleanup_service` deletes it daily                      |

---

## 12. Security

The app is for local/private use. It has no public attack surface.

- **No open ports to the outside:** Services listen on `127.0.0.1` or on the internal Docker network.

- **API keys** (Product Hunt, etc.): in backend environment variables, never in the database or frontend.

- **PocketBase admin:** a single user with a strong password. Admin UI accessible only at localhost:7130.

- **No third-party CORS:** The frontend consumes `/api/*` via rewrite from Next.js to the same host.

- **Backups:** Daily snapshot of the `pb_data/` directory.

**Things you DON'T need:**

- Internal authentication system
- Public rate limiting (not public)
- Custom 2FA
- Access audit log

---

## 13. Deployment

### 13.1 Topology

```
┌──────────────────────────────────┐
│ Personal machine                 │
│ (laptop / NAS / homelab)         │
│                                  │
│ docker-compose:                  │
│ - frontend :7110                 │
│ - backend :7120                  │
│ - pocketbase:7130                │
│                                  │
│ Access: http://localhost:7110    │
└──────────────────────────────────┘
```

### 13.2 docker-compose

```yaml
services:
frontend:
build: ./frontend
ports: ["127.0.0.1:7110:7110"]
environment:
PORT: "7110"
NEXT_PUBLIC_API_URL: "http://localhost:7120"
INTERNAL_API_URL: "http://backend:7120"

backend:
build: ./backend
ports: ["127.0.0.1:7120:7120"]
env_file: ["./backend/.env"]
depends_on: [pocketbase]

pocketbase:
build: ./pocketbase
ports: ["127.0.0.1:7130:7130"]
volumes: ["./pb_data:/pb_data"]
```

> **Rebuild required:** the files are baked into the image. Always use:
>
> ```bash
> docker compose build && docker compose up -d --force-recreate
> ```
>
> `docker compose restart` **does** not reload the code.

### 13.3 Backups

System cron:

```bash
0 3 * * * tar -czf /backups/pb_$(date +%F).tar.gz /path/to/pb_data
```

---

## 14. Configuracion de puertos

Rango **7110-7159** para evitar colisiones con puertos comunes (3000, 5173, 8000, 8080, 8090, 5432, 6379).

### 14.1 Asignacion

| Servicio                  | Puerto | Bind      | Notas                      |
| ------------------------- | ------ | --------- | -------------------------- |
| Frontend Next.js          | 7110   | 127.0.0.1 | Dev y prod                 |
| Backend FastAPI (uvicorn) | 7120   | 127.0.0.1 | API REST                   |
| PocketBase                | 7130   | 127.0.0.1 | DB + Auth + Admin UI `/_/` |
| Reserva - Worker (futuro) | 7140   | -         | No usado                   |
| Reserva - Otro (futuro)   | 7150   | -         | No usado                   |

**Regla:** ningun servicio usa `3xxx`, `5xxx`, `8xxx`, `9xxx`. Cualquier servicio nuevo se asigna en `71xx` con `+10` por servicio.

### 14.2 Desarrollo local

```json
// frontend/package.json
{
  "scripts": {
    "dev": "next dev -p 7110",
    "start": "next start -p 7110"
  }
}
```

URLs en dev:

- Frontend: `http://localhost:7110`
- API: `http://localhost:7120`
- PocketBase admin: `http://localhost:7130/_/`

### 14.3 Variables de entorno

**`backend/.env`:**

```
BACKEND_HOST=0.0.0.0
BACKEND_PORT=7120
POCKETBASE_URL=http://pocketbase:7130
FRONTEND_ORIGIN=http://localhost:7110
PB_ADMIN_EMAIL=admin@alcsaas.dev
PB_ADMIN_PASSWORD=<password-fuerte>
PRODUCTHUNT_TOKEN=<opcional>
COLLECTOR_REQUEST_DELAY_MS=2000
REDDIT_FETCH_COMMENTS=false
TRENDS_GEO=US
TRENDS_TIMEFRAME=today 3-m
```

**`frontend/.env` (solo dev fuera de Docker):**

```
PORT=7110
NEXT_PUBLIC_API_URL=http://localhost:7120
INTERNAL_API_URL=http://localhost:7120
```

---

## 14. Port Configuration

Range **7110-7159** to avoid collisions with common ports (3000, 5173, 8000, 8080, 8090, 5432, 6379).

### 14.1 Port Assignment

| Service                   | Port | Bind      | Notes                      |
| ------------------------- | ---- | --------- | -------------------------- |
| Frontend Next.js          | 7110 | 127.0.0.1 | Dev & Prod                 |
| Backend FastAPI (uvicorn) | 7120 | 127.0.0.1 | REST API                   |
| PocketBase                | 7130 | 127.0.0.1 | DB + Auth + Admin UI `/_/` |

### 14.2 Local Development

```json
// frontend/package.json
{
  "scripts": {
    "dev": "next dev -p 7110",
    "start": "next start -p 7110"
  }
}
```

URLs in dev:

- Frontend: `http://localhost:7110`
- API: `http://localhost:7120`
- PocketBase admin: `http://localhost:7130/_/`

### 14.3 Variables of around

**`backend/.env`:**

```
BACKEND_HOST=0.0.0.0
BACKEND_PORT=7120
POCKETBASE_URL=http://pocketbase:7130
FRONTEND_ORIGIN=http://localhost:7110
PB_ADMIN_EMAIL=admin@alcsaas.dev
PB_ADMIN_PASSWORD=<strong-password>
PRODUCTHUNT_TOKEN=<optional>
COLLECTOR_REQUEST_DELAY_MS=2000
REDDIT_FETCH_COMMENTS=false
TRENDS_GEO=US
TRENDS_TIMEFRAME=today 3-m
```

**`frontend/.env` (only dev outside Docker):**

```
PORT=7110
NEXT_PUBLIC_API_URL=http://localhost:7120
INTERNAL_API_URL=http://localhost:7120
```

---

## 15. MVP - Scope

### Implemented (F01–F17)

- [x] Docker Compose Setup (F01)
- [x] PocketBase Schema with JS migrations (F02)
- [x] FastAPI Backend + CRUD endpoints (F03)
- [x] Reddit Collector - Playwright, without credentials (F04)
- [x] Hacker News Collector (F05)
- [x] Trends Collector - PyTrends + Playwright fallback (F06)
- [x] Product Hunt Collector - GraphQL (F07)
- [x] Processor: cleaning, TF-IDF clustering, signals, summaries (F08)
- [x] PromptBuilder with token estimation (F09)
- [x] PromptViewer with copy to clipboard and .txt download (F09 UI)
- [x] ResponsePaster with auto JSON detection (F10)
- [x] Robust ResponseParser with editor mode and retry (F10)
- [x] Frontend shell with Sidebar, dark mode, RawBlock design system (F11)
- [x] Dashboard with recent scans and top opportunities (F12)
- [x] Scan flow UI: new --> progress --> prompt --> response --> report (F13)
- [x] Opportunities UI: list with filters, detail with notes and status (F14)
- [x] Export to Markdown (F15)
- [x] Settings: source status, env vars, default subreddits (F16)
- [x] Error handling: collecting timeout, raw_data cleanup, error boundaries (F17)


### Explicitly Out of Scope (Will not be done)

- Multi-user
- Paid plans / billing
- Public registration
- Transactional emails
- Public API for third parties
- Mobile app

---
