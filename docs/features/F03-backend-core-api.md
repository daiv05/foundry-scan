# F03 — Backend Core & API Structure

## Objetivo

Establecer la estructura del backend FastAPI, conexion con PocketBase, middleware y todos los endpoints REST (stubs iniciales).

## Alcance

### Estructura del backend

```
backend/
├── app/
│   ├── main.py              # FastAPI app, middleware, lifespan
│   ├── config.py            # Settings desde env vars
│   ├── db.py                # PocketBase SDK client
│   ├── routers/
│   │   ├── scans.py         # /api/scans/*
│   │   ├── opportunities.py # /api/opportunities/*
│   │   └── configs.py       # /api/configs/*
│   ├── services/
│   │   ├── scan_service.py  # Orquestacion del pipeline
│   │   ├── collector/       # (F04-F07)
│   │   ├── processor.py     # (F08)
│   │   ├── prompt_builder.py # (F09)
│   │   └── response_parser.py # (F10)
│   └── models/
│       └── schemas.py       # Pydantic models
├── requirements.txt
├── Dockerfile
└── .env
```

### Conexion PocketBase

Backend usa credenciales del admin user (env vars `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`) para autenticarse contra PocketBase server-side via su SDK Python.

### Middleware opcional

Validar header `Cf-Access-Authenticated-User-Email` en produccion. En dev, skip.

### Endpoints (stubs)

#### Scans

| Metodo | Ruta                           | Descripcion                           |
| ------ | ------------------------------ | ------------------------------------- |
| POST   | /api/scans                     | Crear y lanzar scan                   |
| GET    | /api/scans                     | Listar scans                          |
| GET    | /api/scans/{id}                | Detalle de scan                       |
| GET    | /api/scans/{id}/status         | Estado actual                         |
| DELETE | /api/scans/{id}                | Eliminar scan y datos asociados       |

#### Prompt y respuesta

| Metodo | Ruta                           | Descripcion                           |
| ------ | ------------------------------ | ------------------------------------- |
| GET    | /api/scans/{id}/prompt         | Prompt listo para copiar              |
| POST   | /api/scans/{id}/response       | Recibir respuesta pegada              |
| POST   | /api/scans/{id}/response/retry | Reintentar parseo                     |
| GET    | /api/scans/{id}/response/raw   | Ver respuesta cruda guardada          |

#### Opportunities

| Metodo | Ruta                           | Descripcion                           |
| ------ | ------------------------------ | ------------------------------------- |
| GET    | /api/scans/{id}/opportunities  | Oportunidades de un scan              |
| GET    | /api/opportunities             | Todas las oportunidades               |
| GET    | /api/opportunities/{id}        | Detalle de una oportunidad            |
| PATCH  | /api/opportunities/{id}        | Actualizar estado o notas             |
| GET    | /api/opportunities/new         | Nuevas vs scans previos               |

#### Configs y export

| Metodo | Ruta                               | Descripcion              |
| ------ | ---------------------------------- | ------------------------ |
| POST   | /api/configs                       | Guardar template         |
| GET    | /api/configs                       | Listar templates         |
| PUT    | /api/configs/{id}                  | Actualizar               |
| DELETE | /api/configs/{id}                  | Eliminar                 |
| GET    | /api/scans/{id}/export/markdown    | Exportar reporte MD      |
| GET    | /api/scans/{id}/export/prompt.txt  | Descargar prompt .txt    |

### Pydantic Models

- `ScanCreate`, `ScanResponse`, `ScanStatus`
- `OpportunityResponse`, `OpportunityUpdate`
- `LLMResponseInput` (`response_text`, `llm_used`)
- `ScanConfigCreate`, `ScanConfigResponse`

## Criterios de aceptacion

- [x] FastAPI arranca y todos los endpoints responden (stubs con 501 o datos mock)
- [x] Conexion con PocketBase funcional (CRUD basico)
- [x] Pydantic models definen contratos claros
- [x] `POST /api/scans` crea un registro en PocketBase con status `pending`

## Dependencias

- F01 (servicios corriendo)
- F02 (collections creadas)

## Ref SPEC

Seccion 7
