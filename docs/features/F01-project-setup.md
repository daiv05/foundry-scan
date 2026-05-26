# F01 — Project Setup & Infrastructure

## Objetivo

Establecer la estructura base del proyecto, docker-compose, puertos y variables de entorno para que todos los servicios puedan arrancar.

## Alcance

### Estructura de directorios

```
alcsaas/
├── frontend/          # Next.js + Tailwind CSS
├── backend/           # Python 3.11+ / FastAPI
├── pb_data/           # PocketBase data (gitignored)
├── docker-compose.yml
├── .env.example
└── docs/
```

### docker-compose.yml

4 servicios:

| Servicio    | Puerto | Bind        | Imagen / Build        |
| ----------- | ------ | ----------- | --------------------- |
| frontend    | 7110   | 127.0.0.1   | `./frontend`          |
| backend     | 7120   | 127.0.0.1   | `./backend`           |
| pocketbase  | 7130   | 127.0.0.1   | `./pocketbase` (Alpine + binary, no imagen oficial) |
| cloudflared | —      | —           | `cloudflare/cloudflared:latest` |

Regla de puertos: rango **7110-7159**, incrementos de +10 por servicio. Ningun servicio usa 3xxx, 5xxx, 8xxx, 9xxx.

### Variables de entorno

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
REDDIT_REQUEST_DELAY_MS=2000
REDDIT_FETCH_COMMENTS=true
TRENDS_GEO=US
TRENDS_TIMEFRAME=today 3-m
PRODUCTHUNT_TOKEN=<...>   # opcional — si ausente, la fuente se omite
```

> **Nota:** `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` y `SERPAPI_KEY` fueron **eliminados**.
> El collector de Reddit usa Playwright (sin credenciales) y el fallback de Trends usa Playwright en lugar de SerpAPI.

### Frontend skeleton

- Next.js con Tailwind CSS
- `next dev -p 7110` / `next start -p 7110`
- `next.config.js` con rewrite de `/api/:path*` a `http://backend:7120/api/:path*`

### Backend skeleton

- Python 3.11+, FastAPI, uvicorn
- `uvicorn app.main:app --host 127.0.0.1 --port 7120 --reload`
- Estructura inicial: `app/main.py` con health check

### PocketBase

- Build propio: imagen Alpine con el binario `pocketbase` descargado en el Dockerfile
- `serve --http=0.0.0.0:7130 --dir=/pb_data`
- Volume: `./pb_data:/pb_data`
- Migrations JS en `pocketbase/pb_migrations/` — se aplican automáticamente al arrancar
- Para aplicar cambios de `env_file` usar `docker compose up -d --force-recreate` (no `restart`)

## Criterios de aceptacion

- [x] `docker-compose up` levanta los 3 servicios (sin cloudflared en dev)
- [x] Frontend responde en `http://localhost:7110`
- [x] Backend responde en `http://localhost:7120/health`
- [x] PocketBase admin accesible en `http://localhost:7130/_/`
- [x] Frontend puede hacer fetch a `/api/health` via rewrite

## Dependencias

Ninguna — es el punto de partida.

## Ref SPEC

Secciones 3, 4, 13.2, 14
