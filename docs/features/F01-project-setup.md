# F01 - Project Setup & Infrastructure

## Objective

Establish the basic project structure, Docker Compose, ports, and environment variables so that all services can start.

## Scope

### Directory Structure

```
foundry-scan/
├── frontend/          # Next.js + Tailwind CSS
├── backend/           # Python 3.11+ / FastAPI
├── pb_data/           # PocketBase data (gitignored)
├── docker-compose.yml
├── .env.example
└── docs/
```

### docker-compose.yml

4 services:

| Service | Port | Bind | Image / Build |
| ----------- | ------ | ----------- | --------------------- |
frontend | 7110 | 127.0.0.1 | `./frontend` |
backend | 7120 | 127.0.0.1 | `./backend` |
pocketbase | 7130 | 127.0.0.1 | `./pocketbase` (Alpine + binary, not an official image) |
cloudflared | - | - | `cloudflare/cloudflared:latest` |

Port rule: range **7110-7159**, increments of +10 per service. No service uses 3xxx, 5xxx, 8xxx, or 9xxx.

### Environmental variables

**frontend/.env.local:**
```
PORT=7110
NEXT_PUBLIC_API_URL=http://localhost:7120
NEXT_PUBLIC_PB_URL=http://localhost:7130
```

**backend/.env:**
```
BACKEND_HOST=127.0.0.1
BACKEND_PORT=7120
POCKETBASE_URL=http://127.0.0.1:7130
INTERNAL_API_URL=http://backend:7120
FRONTEND_ORIGIN=http://localhost:7110
PB_ADMIN_EMAIL=admin@alcsaas.dev
PB_ADMIN_PASSWORD=<...>
COLLECTOR_REQUEST_DELAY_MS=2000
REDDIT_FETCH_COMMENTS=true
TRENDS_GEO=US
TRENDS_TIMEFRAME=today 3-m
PRODUCTHUNT_TOKEN=<...>   # Optional - if absent, the source is omitted
```

### Frontend skeleton

- Next.js with Tailwind CSS
- `next dev -p 7110` / `next start -p 7110`
- `next.config.js` with rewrite of `/api/:path*` to `http://backend:7120/api/:path*`

### Backend skeleton

- Python 3.11+, FastAPI, uvicorn
- `uvicorn app.main:app --host 127.0.0.1 --port 7120 --reload`
- Initial structure: `app/main.py` con health check

### PocketBase

- Custom build: Alpine image with the `pocketbase` binary downloaded in the Dockerfile
- `serve --http=0.0.0.0:7130 --dir=/pb_data`
- Volume: `./pb_data:/pb_data`
- JS migrations in `pocketbase/pb_migrations/` - applied automatically on startup
- To apply changes to `env_file`, use `docker compose up -d --force-recreate` (not `restart`)

## Acceptance Criteria

- [x] `docker-compose up` starts all 3 services (without Cloudflare in dev)
- [x] Frontend responds at `http://localhost:7110`
- [x] Backend responds at `http://localhost:7120/health`
- [x] PocketBase admin is accessible at `http://localhost:7130/_/`
- [x] Frontend can fetch `/api/health` via rewrite

## Dependencies

None - this is the starting point.

## Ref SPEC

Sections 3, 4, 13.2, 14
