# Local Development Setup

This guide covers everything needed to run FoundryScan on your machine, including hot-reload development mode and common maintenance tasks.

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| [Docker Desktop](https://docs.docker.com/get-docker/) | 26+ | Compose v2 must be included |
| Git | any | |
| Free ports | 7110, 7120, 7130 | Configurable in `.env` files |
| Disk space | ~1.5 GB | Playwright Chromium + Python + Node deps |

---

## 1. Clone the repository

```bash
git clone https://github.com/daiv05/foundry-scan.git
cd foundry-scan
```

---

## 2. Configure environment files

```bash
cp .env.example          .env
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

### Root `.env` - PocketBase credentials

This file is read by Docker Compose to initialize the PocketBase admin account on first boot.

| Variable | Default | Action |
|---|---|---|
| `PB_ADMIN_EMAIL` | `admin@example.com` | Change if you want |
| `PB_ADMIN_PASSWORD` | `changeme` | **Change this** |

> **Important:** these values must match the same variables in `backend/.env`. The backend uses them to authenticate against PocketBase at runtime.

### `backend/.env` - backend configuration

| Variable | Default | Action |
|---|---|---|
| `PB_ADMIN_EMAIL` | `admin@example.com` | Must match root `.env` |
| `PB_ADMIN_PASSWORD` | `changeme` | **Change this** - must match root `.env` |
| `PRODUCTHUNT_TOKEN` | _(empty)_ | Optional - get one free at [api.producthunt.com](https://api.producthunt.com/v2/oauth/applications) |

Everything else works out of the box:

| Variable | Default | Description |
|---|---|---|
| `BACKEND_HOST` | `0.0.0.0` | Bind address |
| `BACKEND_PORT` | `7120` | Port |
| `POCKETBASE_URL` | `http://localhost:7130` | Overridden to `http://pocketbase:7130` by Docker Compose automatically |
| `FRONTEND_ORIGIN` | `http://localhost:7110` | CORS allowed origin |
| `COLLECTOR_REQUEST_DELAY_MS` | `1200` | Min delay between requests (ms) - increase if getting blocked |
| `REDDIT_FETCH_COMMENTS` | `true` | Fetch comment threads - richer data, slightly slower |
| `TRENDS_GEO` | `US` | Google Trends country code (empty = worldwide) |
| `TRENDS_TIMEFRAME` | `now 7-d` | Trends lookback window |

### `frontend/.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7110` | Next.js server port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:7120` | Backend URL (used by the browser) |
| `NEXT_PUBLIC_PB_URL` | `http://localhost:7130` | PocketBase URL (used by the browser) |

---

## 3. Build and start

```bash
docker compose up --build
```

`docker compose up` automatically loads `docker-compose.override.yml` alongside `docker-compose.yml`. The override configures the frontend dev build stage (`npm run dev`) and enables `--reload` on the backend — so this is the development mode by default.

First build downloads Playwright Chromium (~170 MB) and all Python/Node dependencies. It takes **3–5 minutes** once and is fast on subsequent starts.

| Service | URL |
|---|---|
| Frontend | http://localhost:7110 |
| Backend API docs | http://localhost:7120/docs |
| PocketBase admin | http://localhost:7130/_/ |

### PocketBase first boot

On first run, the PocketBase container automatically creates the admin account using `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` from the root `.env`. This is idempotent — if the account already exists, the step is silently skipped.

If you change the password after the first run, update it in both `.env` and `backend/.env`, then wipe `pb_data/` and restart (or update it manually in the PocketBase admin UI at `/_/`).

---

## 4. Development hot-reload

Docker Compose Watch syncs source files into running containers without a full rebuild. It requires running in the foreground with the `--watch` flag:

```bash
docker compose up --watch
```

> **Note:** `--watch` cannot be combined with `-d`. Run it in a dedicated terminal tab.

What each service does when files change:

| Service | Trigger | Action |
|---|---|---|
| **Frontend** (`src/`, `public/`) | Any file change | Files synced into container; Next.js HMR refreshes the browser automatically |
| **Frontend** (`package.json`) | Dependency change | Full image rebuild |
| **Backend** (any `.py` file) | Any file change | Files synced + container restarted; uvicorn reloads |
| **PocketBase** | Migration added | Requires manual `docker compose build pocketbase` (see §5) |

For regular use without watch mode (e.g. after pulling updates):

```bash
docker compose up -d
```

---

## 5. Rebuilding after dependency or migration changes

### New Python dependency

```bash
# Add to backend/requirements.txt, then:
docker compose build backend
docker compose up -d --force-recreate backend
```

### New npm package

```bash
# Add to frontend/package.json, then:
docker compose build frontend
docker compose up -d --force-recreate frontend
```

### New PocketBase migration

Migrations live in `pocketbase/pb_migrations/` and are baked into the image at build time.

```bash
# After adding a new migration file:
docker compose build pocketbase
docker compose up -d --force-recreate pocketbase
# Backend may need re-auth after PocketBase restart:
docker compose up -d --force-recreate backend
```

---

## 6. Resetting the database

PocketBase data is stored in `pb_data/` (gitignored). To wipe everything and start fresh:

```bash
docker compose down
rm -rf pb_data/
docker compose up -d
```

The PocketBase admin account will be re-created automatically from your `.env` on the next boot.

---

## 7. Running services outside Docker (optional)

For faster iteration you can run backend or frontend directly on your host.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --port 7120
```

Set `POCKETBASE_URL=http://localhost:7130` in `backend/.env` when running outside Docker (this is already the default in the example file).

### Frontend

```bash
cd frontend
npm install
npm run dev -- --port 7110
```

---

## 8. Useful commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Open a shell inside a container
docker compose exec backend bash
docker compose exec frontend sh

# Stop everything
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```
