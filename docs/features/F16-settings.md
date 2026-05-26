# F16 — Settings & Configuration

## Objetivo

Pagina de configuracion que muestra el estado de las fuentes de datos, los env vars activos y permite gestionar los subreddits por defecto del scan.

## Alcance

### Pagina: /settings

#### 1. Data Sources panel

4 tarjetas con badge de estado:

| Fuente        | Estado      | Credenciales |
| ------------- | ----------- | ------------ |
| Reddit        | Ready       | Ninguna (Playwright scraping) |
| Hacker News   | Ready       | Ninguna (API pública) |
| Google Trends | Ready       | Ninguna (PyTrends + Playwright fallback) |
| Product Hunt  | Configured / Not configured | `PRODUCTHUNT_TOKEN` opcional |

Cada tarjeta muestra: nombre, badge de estado, método de conexión, y config activa (valores de env vars relacionados).

#### 2. Environment Variables panel

Tabla read-only de las variables de entorno activas del backend:

| Variable                  | Tipo     |
| ------------------------- | -------- |
| `PRODUCTHUNT_TOKEN`       | presencia (set / not set) — token nunca expuesto |
| `TRENDS_GEO`              | valor actual |
| `TRENDS_TIMEFRAME`        | valor actual |
| `REDDIT_REQUEST_DELAY_MS` | valor actual |
| `REDDIT_FETCH_COMMENTS`   | valor actual |

Incluye instrucciones de cómo actualizar: editar `backend/.env` + `docker compose up -d --force-recreate backend`.

> **Nota:** Los env vars NO son editables desde la UI (seguridad + los containers necesitan `--force-recreate` para recargarlos, no solo restart).

#### 3. Scan Defaults panel

Editor de subreddits por defecto almacenados en `scan_configs` con `is_default=true`.

- Tags removibles por subreddit
- Input para agregar nuevos (Enter o botón Add)
- Botón "Save defaults" — POST o PUT según si ya existe un default
- `/scan/new` carga estos defaults al inicializar

### Endpoint nuevo

| Metodo | Ruta                  | Descripcion                                   |
| ------ | --------------------- | --------------------------------------------- |
| GET    | /api/settings/status  | Estado de fuentes + snapshot de config activa |

Los endpoints de `/api/configs` (CRUD) ya existian desde F03 y se usan para los scan defaults.

### Variables de entorno relevantes (actualizadas vs spec original)

Las variables `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` y `SERPAPI_KEY` fueron eliminadas.
Solo `PRODUCTHUNT_TOKEN` requiere configuración manual.

## Criterios de aceptacion

- [x] Pagina de settings accesible desde navegacion
- [x] Muestra status de conexion de cada fuente de datos
- [x] Configuracion basica de subreddits por defecto (editable, se persiste en DB)
- [x] UI clara indicando que keys van en env vars del backend con instrucciones exactas

## Dependencias

- F11 (shell y routing)
- F03 (endpoints de configs, settings/status)

## Ref SPEC

Seccion 8.1 (ruta /settings), seccion 7.1 (endpoints configs)
