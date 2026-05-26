# SaaS Scout — Especificacion Tecnica

> **Herramienta personal y privada** para buscar oportunidades de micro-SaaS automaticamente. Investiga internet, detecta oportunidades con evidencia real y genera reportes cuantificados.
>
> **No es un SaaS:** es una herramienta privada de un solo usuario. Los SaaS reales son los que eventualmente se construyan a partir de las ideas que esta herramienta descubra.
>
> **Modelo de analisis manual:** la app automatiza recoleccion, limpieza y clustering. El analisis con LLM se hace pegando el prompt generado en Claude / ChatGPT / Gemini desde la cuenta personal del usuario, y pegando la respuesta de vuelta. Sin costos de API.
>
> **Despliegue privado:** se aloja en una maquina personal (laptop, NAS, homelab) y se expone via Cloudflare Tunnel + Cloudflare Access para acceso remoto seguro solo del propietario.

---

## 1. Vision del producto

Una herramienta personal que automatice el proceso de descubrir nichos de micro-SaaS con evidencia real, evitando los riesgos clasicos: ideas genericas, falta de datos, intuicion sin respaldo.

Flujo de uso esperado:

1. Lanzar un scan ocasionalmente (semanal, mensual, cuando aparezca tiempo libre)
2. La app recolecta y procesa datos automaticamente (~3 minutos)
3. Copiar el prompt generado en Claude/ChatGPT desde la cuenta personal
4. Pegar la respuesta de vuelta
5. Revisar el reporte, marcar las ideas interesantes como "evaluating" o "building"
6. Si una idea pasa el filtro personal → construir el SaaS real (proyecto separado)

---

## 2. Usuario objetivo

**Un solo usuario: el propietario de la app.**

No hay multi-usuario, ni invitaciones, ni planes, ni billing. Cualquier complejidad relacionada a esto queda fuera del alcance.

---

## 3. Arquitectura general

```
┌──────────────────────────────────────────────────────────┐
│                      Internet                            │
└────────────────┬─────────────────────────────────────────┘
                 │ Cloudflare Tunnel + Access (auth Zero Trust)
                 ▼
┌──────────────────────────────────────────────────────────┐
│              Maquina personal (laptop / NAS)             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │            FRONTEND (Next.js)                     │   │
│  │  Dashboard / Config / Prompt / Response / Report  │   │
│  └─────────────────────┬────────────────────────────┘   │
│                        │ REST                            │
│  ┌─────────────────────▼────────────────────────────┐   │
│  │           BACKEND (Python / FastAPI)              │   │
│  │                                                   │   │
│  │  Collector → Processor → PromptBuilder            │   │
│  │                                ↓                  │   │
│  │                       [manual LLM externo]        │   │
│  │                                ↓                  │   │
│  │                         ResponseParser            │   │
│  └─────────────────────┬────────────────────────────┘   │
│                        │                                 │
│  ┌─────────────────────▼────────────────────────────┐   │
│  │           PocketBase (SQLite)                     │   │
│  │  scans / opportunities / raw_data / configs       │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

El scan se "pausa" entre `PromptBuilder` y `ResponseParser` mientras el usuario interactua con el LLM externo en otra pestana.

---

## 4. Stack tecnologico

| Capa          | Tecnologia                  | Justificacion                          |
| ------------- | --------------------------- | -------------------------------------- |
| Frontend      | Next.js + Tailwind CSS      | UI moderna, dev rapido                 |
| Backend       | Python 3.11+ / FastAPI      | Ecosistema de scraping y datos         |
| Base de datos | PocketBase (SQLite)         | Single binary, sin servicios externos  |
| Auth de app   | **Cloudflare Access**       | Zero Trust antes de tocar la app       |
| LLM           | **Manual** (Claude/ChatGPT) | Sin API key, usa cuenta personal       |
| Acceso remoto | **Cloudflare Tunnel**       | Sin IP publica, sin abrir puertos      |
| Scheduling    | APScheduler                 | Cron interno del backend               |
| Clustering    | scikit-learn                | TF-IDF + KMeans local                  |
| Reddit        | Playwright (scraping)       | Sin credenciales, `old.reddit.com`     |
| Trends        | PyTrends + Playwright fallback | Google Trends (sin SerpAPI)         |

**No incluye:** Vercel, Railway, hosting publico, registro de usuarios, sistema de pagos, emails transaccionales.

---

## 5. Modulos del backend

### 5.1 Collector Module

Recolecta datos crudos de fuentes externas.

#### 5.1.1 Reddit Collector
- **Libreria:** Playwright (scraping de `old.reddit.com`, sin credenciales)
- **Subreddits por defecto:** r/SaaS, r/Entrepreneur, r/smallbusiness, r/freelance, r/webdev
- **Subreddits configurables** desde la app

**Keywords de dolor:**
```
pain, workflow, manual, expensive, spreadsheet, automation,
hate this tool, waste time, repetitive, tedious, frustrated,
broken, annoying, slow, overpriced
```

**Keywords de demanda real (willingness-to-pay):**
```
I'd pay for, shut up and take my money, is there a tool that,
looking for a solution, willing to pay, I need something that,
does anyone know a tool, recommendation for, take my money,
would pay good money
```

**Output por post:**
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
- API publica, sin autenticacion
- Top stories, New stories, Ask HN, Show HN
- Filtro: posts con 5+ puntos relacionados a SaaS, automatizacion

#### 5.1.3 Trends Collector
- Primario: PyTrends
- Fallback: Playwright (scraping de trends.google.com)
- Fallback automatico si PyTrends falla (sin `SERPAPI_KEY`)

#### 5.1.4 Product Hunt Collector
- API GraphQL con OAuth
- Rol: filtro de competencia y saturacion exclusivamente

---

### 5.2 Processor Module

Transforma datos crudos en input limpio para el LLM externo.

#### 5.2.1 Limpieza
- Posts con menos de 10 palabras: descartar
- Spam (links excesivos, auto-promocion): descartar
- Normalizacion de texto
- Deduplicacion de posts similares

#### 5.2.2 Clustering
- TF-IDF + KMeans (scikit-learn)
- Numero de clusters: automatico via silhouette score, entre 3-15 (K_MIN=3, K_MAX=15)
- Deduplicacion previa via similitud coseno ≥ 0.85

#### 5.2.3 Deteccion de senales

| Tipo            | Peso |
| --------------- | ---- |
| Pain signal     | 1x   |
| Demand signal   | 3x   |
| High engagement | 1.5x |
| Ask HN post     | 2x   |

#### 5.2.4 Resumenes por cluster

1-2 parrafos por cluster: tema, conteos, senales, frases representativas (sin copiar posts enteros).

---

### 5.3 PromptBuilder Module

Construye un prompt completo y autocontenido listo para pegar en cualquier LLM externo.

#### 5.3.1 Responsabilidades

- Tomar clusters procesados + datos de validacion
- Generar prompt con instrucciones estrictas de formato de respuesta JSON
- Estimar tokens y advertir si excede limites comunes
- No requiere `submission_token` (uso personal, sin links compartibles)

#### 5.3.2 Estructura del prompt generado

```
=== CONTEXTO ===
Eres un analista de mercado especializado en micro-SaaS.
Vas a recibir datos procesados de Reddit, Hacker News, Google Trends
y Product Hunt sobre nichos potenciales.

=== DATOS ===
[clusters con resumen, post_count, demand_signals, pain_signals,
 trend_data, competition]

=== INSTRUCCIONES ===
Para cada oportunidad genera:
- nombre, problema, evidencia con numeros
- scoring 1-10 en 4 criterios (pain 30%, trend 20%, competencia 25%, MVP 25%)
- score total ponderado
- target user, MVP features, monetizacion, build time
- razonamiento

Filtra: descarta AI chatbots genericos, AI wrappers, AI note apps,
AI coding assistants, ideas tipo "Uber para X" sin evidencia.

=== FORMATO DE RESPUESTA (CRITICO) ===
Responde EXCLUSIVAMENTE con un bloque JSON valido dentro de ```json
con la siguiente estructura exacta:

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
```

No incluyas texto fuera del bloque JSON. No agregues comentarios.
```

#### 5.3.3 Estimacion de tokens

| Tamano del prompt | Modelo recomendado                          |
| ----------------- | ------------------------------------------- |
| < 8K tokens       | Cualquier LLM moderno                       |
| 8K - 32K          | Claude Sonnet/Opus, GPT-4, Gemini Pro       |
| 32K - 100K        | Claude (cualquiera), Gemini 1.5+            |
| > 100K            | Advertir y ofrecer modo "comprimido"        |

Si el prompt es muy grande, ofrecer comprimir resumenes.

---

### 5.4 ResponseParser Module

Recibe la respuesta pegada y la convierte en oportunidades estructuradas.

#### 5.4.1 Pipeline de parseo

1. Extraer bloque JSON ```` ```json ... ``` ```` ; fallback: primer `{ ... }` balanceado
2. Reparar JSON malformado (trailing commas, comillas simples, comentarios `//`)
3. Validar schema con Pydantic
4. Validar valores: scores en [1, 10], rank unico, campos requeridos
5. **Recalcular score ponderado en backend** (no confiar en el total que envio el LLM)
6. Insertar oportunidades vinculadas al `scan_id`

#### 5.4.2 Manejo de errores

| Error                              | Accion                                       |
| ---------------------------------- | -------------------------------------------- |
| No se encuentra bloque JSON        | Mostrar instrucciones de formato + retry     |
| JSON invalido                      | Intentar reparacion; si falla, retry         |
| Schema invalido (campos faltantes) | Mostrar diff de lo que falta + retry         |
| Score fuera de rango               | Auto-clamp a [1, 10] + advertencia visible   |
| Cero oportunidades                 | Pedir confirmacion antes de guardar          |

#### 5.4.3 Modo asistido

Si el parseo falla, ofrecer editor JSON con validacion en vivo.

---

## 6. Base de datos (PocketBase / SQLite)

### 6.1 Auth: simplificado

Como el acceso a la app esta protegido por Cloudflare Access, PocketBase Auth se usa solo como capa interna minima.

**Opciones:**

- **A) Sin auth de PocketBase:** todas las collections con regla abierta `@request.headers.X-Cf-Access-Authenticated-User-Email != ""`. La identidad del usuario viene del header que Cloudflare Access inyecta.
- **B) Single admin user:** un solo usuario administrador creado en setup inicial (`./pocketbase superuser create email password`). El backend FastAPI usa estas credenciales para hablar con PocketBase server-side.

**Recomendado: opcion B**, con un solo usuario fijo creado en el setup. Mas simple y desacoplado de Cloudflare.

No existe collection `users` con multiples filas. No hay registro publico. No hay reset de password via email.

### 6.2 Collection: scans

| Campo               | Tipo      | Notas                                     |
| ------------------- | --------- | ----------------------------------------- |
| id                  | text      | PK                                        |
| status              | select    | ver estados abajo                         |
| config              | json      | configuracion del scan                    |
| prompt_text         | text      | prompt generado                           |
| prompt_tokens_est   | number    | estimacion de tokens                      |
| llm_response_raw    | text      | respuesta cruda pegada                    |
| llm_used            | text      | etiqueta opcional ("Claude Opus 4.7")     |
| started_at          | date      |                                           |
| processed_at        | date      | cuando termino el processor               |
| submitted_at        | date      | cuando se pego la respuesta               |
| completed_at        | date      |                                           |
| error_message       | text      |                                           |

**Estados:** `pending` | `collecting` | `processing` | `awaiting_llm_input` | `parsing` | `completed` | `failed`

### 6.3 Collection: opportunities

| Campo            | Tipo      | Notas                                  |
| ---------------- | --------- | -------------------------------------- |
| id               | text      | PK                                     |
| scan             | relation  | → scans (cascade delete)               |
| rank             | number    |                                        |
| score            | number    | 1.0 - 10.0                             |
| name             | text      |                                        |
| problem          | text      |                                        |
| evidence         | json      |                                        |
| scoring          | json      | 4 criterios                            |
| target_user      | text      |                                        |
| mvp_features     | json      |                                        |
| monetization     | text      |                                        |
| build_time       | text      |                                        |
| reasoning        | text      |                                        |
| user_status      | select    | new / evaluating / discarded / building / archived |
| notes            | text      | notas personales sobre la idea          |
| created          | autodate  |                                        |

### 6.4 Collection: raw_data

| Campo        | Tipo      | Notas                          |
| ------------ | --------- | ------------------------------ |
| id           | text      | PK                             |
| scan         | relation  | → scans (cascade delete)       |
| source       | select    | reddit / hackernews / trends / producthunt |
| data         | json      | payload crudo                  |
| collected_at | autodate  |                                |

### 6.5 Collection: scan_configs

Templates de configuracion reutilizables.

| Campo      | Tipo      |
| ---------- | --------- |
| id         | text      |
| name       | text      |
| config     | json      |
| is_default | bool      |
| created    | autodate  |

### 6.6 Indices

```
scans:           (status), (created)
opportunities:   (scan), (user_status), (score DESC)
raw_data:        (scan, source)
```

Sin columna `user` en ninguna collection: la app es de un solo usuario.

---

## 7. API REST (FastAPI sobre PocketBase)

El backend FastAPI orquesta el pipeline. Para CRUD simple usa el SDK de PocketBase con credenciales del admin user. Para operaciones complejas expone endpoints propios.

### 7.1 Endpoints

#### Scans

| Metodo | Ruta                          | Descripcion                                |
| ------ | ----------------------------- | ------------------------------------------ |
| POST   | /api/scans                    | Crear y lanzar (collect + process)         |
| GET    | /api/scans                    | Listar scans                               |
| GET    | /api/scans/{id}               | Detalle                                    |
| GET    | /api/scans/{id}/status        | Estado actual                              |
| DELETE | /api/scans/{id}               | Eliminar scan y datos asociados            |

#### Prompt y respuesta manual

| Metodo | Ruta                                  | Descripcion                                |
| ------ | ------------------------------------- | ------------------------------------------ |
| GET    | /api/scans/{id}/prompt                | Devuelve el prompt listo para copiar       |
| POST   | /api/scans/{id}/response              | Recibe la respuesta pegada                 |
| POST   | /api/scans/{id}/response/retry        | Reintentar parseo                          |
| GET    | /api/scans/{id}/response/raw          | Ver respuesta cruda guardada               |

**Request POST /api/scans/{id}/response:**
```json
{
  "response_text": "```json\n{ \"opportunities\": [...] }\n```",
  "llm_used": "Claude Opus 4.7"
}
```

#### Opportunities

| Metodo | Ruta                              | Descripcion                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | /api/scans/{id}/opportunities     | Oportunidades de un scan             |
| GET    | /api/opportunities                | Todas las oportunidades              |
| PATCH  | /api/opportunities/{id}           | Actualizar estado o notas            |
| GET    | /api/opportunities/new            | Nuevas vs scans previos              |

#### Configs y export

| Metodo | Ruta                                  | Descripcion                  |
| ------ | ------------------------------------- | ---------------------------- |
| POST   | /api/configs                          | Guardar template             |
| GET    | /api/configs                          | Listar templates             |
| PUT    | /api/configs/{id}                     | Actualizar                   |
| DELETE | /api/configs/{id}                     | Eliminar                     |
| GET    | /api/scans/{id}/export/markdown       | Exportar reporte MD          |
| GET    | /api/scans/{id}/export/prompt.txt     | Descargar prompt .txt        |

### 7.2 Autenticacion

**Externa (Cloudflare Access):** cualquier request al frontend o `/api/*` debe pasar primero por Cloudflare Access. Esto es transparente para la app — el browser maneja el flow de Access automaticamente.

**Interna (frontend ↔ backend):** opcional. Como ya esta protegido por Access, puede dejarse abierto. Si se quiere doble factor, validar el header `Cf-Access-Authenticated-User-Email` en FastAPI middleware.

**Backend ↔ PocketBase:** credenciales del admin user almacenadas en variables de entorno del backend.

---

## 8. Frontend (Next.js)

### 8.1 Paginas

| Ruta                       | Pagina                | Descripcion                                |
| -------------------------- | --------------------- | ------------------------------------------ |
| /                          | **Dashboard**         | Scans recientes, top opportunities         |
| /scan/new                  | Nuevo Scan            | Configurar y lanzar                        |
| /scan/[id]                 | Detalle Scan          | Progreso, prompt o reporte segun estado    |
| /scan/[id]/prompt          | **Prompt Viewer**     | Prompt listo para copiar                   |
| /scan/[id]/response        | **Response Paster**   | Textarea para pegar respuesta              |
| /scan/[id]/report          | Reporte               | Reporte final                              |
| /opportunities             | Listado               | Filtros y estados                          |
| /opportunities/[id]        | Detalle               | Detalle + notas personales                 |
| /settings                  | Configuracion         | API keys (Reddit, SerpAPI), templates      |

**No hay `/login` ni `/signup`.** Cloudflare Access maneja la autenticacion antes de que el browser cargue la app. La home page (`/`) es directamente el dashboard.

### 8.2 Componentes clave

**ScanProgress** — barra con estados (collecting → processing → awaiting input → parsing → completed)

**PromptViewer**:
- Bloque de codigo con el prompt completo
- Boton **"Copy to clipboard"**
- Contador de tokens estimado con badge de color
- Tabla de modelos recomendados segun tamano
- Boton de descarga `.txt`
- Links rapidos a [claude.ai/new](https://claude.ai/new), [chatgpt.com](https://chatgpt.com), [gemini.google.com](https://gemini.google.com)
- Instrucciones: "1. Copia. 2. Pega en tu LLM. 3. Vuelve aqui con la respuesta."

**ResponsePaster**:
- Textarea grande
- Auto-deteccion de bloque JSON al pegar
- Preview en vivo del JSON detectado (check verde / X rojo)
- Selector opcional: "Que LLM usaste?"
- Boton **"Parse & Save"**
- Modo editor inline si el parseo falla

**OpportunityCard** — nombre, score (badge de color), problema, tags de evidencia, boton de estado.

**ScoreBar** — 4 barras + total. Verde 8+, amarillo 5-7, rojo <5.

**TrendBadge** — flecha arriba/horizontal/abajo.

**CompetitionMeter** — semaforo de saturacion.

**NotesPanel** — campo de notas personales en cada oportunidad (lo que pienso, decisiones, links a investigacion adicional).

### 8.3 UX del scan completo

```
[1] Lanzar scan desde /scan/new
       │
       ▼
[2] ScanProgress en /scan/[id]: collecting → processing
       │
       ▼ (polling o realtime de PocketBase)
[3] PromptViewer: "Tu prompt esta listo. Pegalo en tu LLM."
       │
       ▼ "I have a response"
       │
       ▼
[4] ResponsePaster: pegar respuesta del LLM
       │
       ▼ "Parse & Save"
       │
       ▼
[5] /scan/[id]/report con oportunidades rankeadas
```

---

## 9. Pipeline de ejecucion de un scan

```
[Lanzar scan]
       │
       ▼
  scan.status = 'collecting'
       │
       ├── Reddit Collector (async)
       ├── HN Collector (async)
       ├── Trends Collector (async)
       └── PH Collector (async)
       │
       ▼
  scan.status = 'processing'
       │
       ├── Limpieza
       ├── Clustering (TF-IDF + KMeans)
       ├── Deteccion de senales
       └── Resumenes
       │
       ▼
  PromptBuilder genera prompt
  scan.status = 'awaiting_llm_input'
       │
       ▼
  [PAUSA — usuario externo trabaja en LLM]
       │
       ▼
  POST /api/scans/{id}/response
  scan.status = 'parsing'
       │
       ├── Extraer + reparar JSON
       ├── Validar schema
       ├── Recalcular scores
       └── Insertar opportunities
       │
       ▼
  scan.status = 'completed'
```

Tiempos:
- Collecting + processing: **2-4 minutos**
- Espera del usuario: **variable** (minutos a dias)
- Parsing: **< 5 segundos**

---

## 10. Scans programados

APScheduler en el backend dispara scans en horarios configurables (ej: lunes a las 9am).

El pipeline corre automaticamente hasta `awaiting_llm_input`. En lugar de email, el dashboard muestra una notificacion persistente:

> **Tu scan semanal esta listo.** Pegalo en tu LLM para continuar.

Como es una app personal, la notificacion en el dashboard es suficiente. No hay sistema de emails.

Si pasan 30 dias sin que el usuario complete el scan, el `raw_data` se elimina automaticamente (el prompt sigue accesible).

---

## 11. Manejo de errores

| Escenario                     | Comportamiento                                          |
| ----------------------------- | ------------------------------------------------------- |
| Reddit API rate limit         | Retry con backoff exponencial (max 3)                   |
| PyTrends falla                | Fallback automatico a SerpAPI                            |
| SerpAPI cuota agotada         | Omitir trends, marcar fuente como "sin datos"            |
| Product Hunt API caida        | Omitir competencia, marcar fuente como "sin datos"       |
| Scan excede 10 min en collect | Timeout, status = 'failed'                              |
| Prompt muy grande (>100K)     | Ofrecer modo comprimido                                  |
| Respuesta LLM no parseable    | Retry asistido con editor JSON                            |
| Texto sin JSON                | Instrucciones + ejemplo de formato                       |

---

## 12. Seguridad

Como es una app personal expuesta solo via Cloudflare Tunnel + Access, el modelo de amenaza es muy distinto al de un SaaS publico:

- **Acceso externo:** unicamente via Cloudflare Access con login (Google, GitHub, email pin). Cualquier request sin token valido es bloqueado por Cloudflare antes de llegar a la app.
- **Sin puertos abiertos en la maquina:** el Tunnel mantiene una conexion saliente a Cloudflare; no se abre ningun puerto en el firewall del usuario.
- **Sin IP publica:** el Tunnel oculta la IP de la maquina host.
- **API keys de Reddit/SerpAPI/Product Hunt:** en variables de entorno del backend, no en la DB. Configuradas una sola vez.
- **PocketBase admin:** un solo usuario con password fuerte. Admin UI accesible solo en la red local o a traves del tunnel.
- **Backups:** snapshot diario del directorio `pb_data/` a almacenamiento externo (Backblaze B2, S3, NAS).
- **No se almacena texto crudo de Reddit completo:** solo resumenes y metadata. Reduce superficie de datos personales.

**Cosas que NO necesita:**
- Sistema de auth interno (Cloudflare Access lo cubre)
- Rate limiting publico (no es publico)
- CORS estricto (mismo origen tras el tunnel)
- 2FA propio (Cloudflare Access tiene 2FA)
- Audit log de accesos (Cloudflare logs cubren esto)

---

## 13. Deployment

### 13.1 Topologia

```
                        Internet
                           │
                           ▼
                ┌──────────────────────┐
                │  Cloudflare edge     │
                │  + Access (auth)     │
                │  + Tunnel (egress)   │
                └──────────┬───────────┘
                           │ TLS via cloudflared
                           ▼
            ┌─────────────────────────────────┐
            │   Maquina personal              │
            │   (laptop / NAS / homelab)      │
            │                                  │
            │   docker-compose:                │
            │   - cloudflared                  │
            │   - frontend  :7110              │
            │   - backend   :7120              │
            │   - pocketbase:7130              │
            │                                  │
            │   Bind: 127.0.0.1 unicamente     │
            └─────────────────────────────────┘
```

### 13.2 docker-compose recomendado

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["127.0.0.1:7110:7110"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:7120
      PORT: 7110

  backend:
    build: ./backend
    ports: ["127.0.0.1:7120:7120"]
    environment:
      BACKEND_PORT: 7120
      POCKETBASE_URL: http://pocketbase:7130
      PB_ADMIN_EMAIL: ${PB_ADMIN_EMAIL}
      PB_ADMIN_PASSWORD: ${PB_ADMIN_PASSWORD}
      REDDIT_CLIENT_ID: ${REDDIT_CLIENT_ID}
      REDDIT_CLIENT_SECRET: ${REDDIT_CLIENT_SECRET}
      SERPAPI_KEY: ${SERPAPI_KEY}
      PRODUCTHUNT_TOKEN: ${PRODUCTHUNT_TOKEN}
    depends_on: [pocketbase]

  pocketbase:
    image: pocketbase/pocketbase:latest
    ports: ["127.0.0.1:7130:7130"]
    command: ["serve", "--http=0.0.0.0:7130"]
    volumes: ["./pb_data:/pb_data"]

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on: [frontend, backend]
```

### 13.3 Configuracion del Tunnel

1. Crear tunnel en el dashboard de Cloudflare Zero Trust
2. Configurar un hostname publico: `scout.midominio.com`
3. Apuntar a `http://frontend:7110` (red interna del docker-compose)
4. Habilitar **Cloudflare Access** con politica:
   - Permitir solo email = `mi-email@personal.com`
   - 2FA obligatorio
5. Guardar el `TUNNEL_TOKEN` en `.env`

### 13.4 Rutas del tunnel

Una sola entrada: `scout.midominio.com` → frontend. El frontend hace fetch a `/api/*` que el reverse-proxy interno (puede ser el mismo Next.js via `rewrites`) redirige al backend en `:7120`.

Para evitar montar reverse proxy adicional, en `next.config.js`:

```js
async rewrites() {
  return [
    { source: '/api/:path*', destination: 'http://backend:7120/api/:path*' },
  ];
}
```

### 13.5 Backups

Cron del sistema (no APScheduler):

```bash
0 3 * * * tar -czf /backups/pb_$(date +%F).tar.gz /path/to/pb_data && \
          rclone copy /backups b2:saasscout-backups
```

---

## 14. Configuracion de puertos

Rango **7110-7159** para evitar colisiones con puertos comunes (3000, 5173, 8000, 8080, 8090, 5432, 6379).

### 14.1 Asignacion

| Servicio                    | Puerto | Bind                | Notas                              |
| --------------------------- | ------ | ------------------- | ---------------------------------- |
| Frontend Next.js            | 7110   | 127.0.0.1           | Dev y prod                         |
| Backend FastAPI (uvicorn)   | 7120   | 127.0.0.1           | API REST                           |
| PocketBase                  | 7130   | 127.0.0.1 (host)    | DB + Auth + Admin UI `/_/`         |
| Reserva — Worker (futuro)   | 7140   | —                   | No usado                           |
| Reserva — Otro (futuro)     | 7150   | —                   | No usado                           |

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

```bash
# backend
uvicorn app.main:app --host 127.0.0.1 --port 7120 --reload
```

```bash
# pocketbase
./pocketbase serve --http=127.0.0.1:7130
```

URLs en dev:
- Frontend: `http://localhost:7110`
- API: `http://localhost:7120`
- PocketBase admin: `http://localhost:7130/_/`

### 14.3 Variables de entorno (dev)

**`frontend/.env.local`:**
```
PORT=7110
NEXT_PUBLIC_API_URL=http://localhost:7120
NEXT_PUBLIC_PB_URL=http://localhost:7130
```

**`backend/.env`:**
```
BACKEND_HOST=127.0.0.1
BACKEND_PORT=7120
POCKETBASE_URL=http://127.0.0.1:7130
FRONTEND_ORIGIN=http://localhost:7110
PB_ADMIN_EMAIL=admin@local
PB_ADMIN_PASSWORD=<...>
REDDIT_CLIENT_ID=<...>
REDDIT_CLIENT_SECRET=<...>
SERPAPI_KEY=<...>
PRODUCTHUNT_TOKEN=<...>
```

**PocketBase:**
```
PB_HTTP=127.0.0.1:7130
PB_DATA_DIR=./pb_data
```

### 14.4 Produccion (Cloudflare Tunnel)

Los mismos puertos, pero los servicios corren dentro de `docker-compose` y se comunican por la red interna del compose (`frontend:7110`, `backend:7120`, `pocketbase:7130`). Solo `cloudflared` accede al exterior.

**Variables del frontend en prod:**
```
NEXT_PUBLIC_API_URL=https://scout.midominio.com/api
NEXT_PUBLIC_PB_URL=https://scout.midominio.com/pb   # solo si se expone admin UI
PORT=7110
```

**Variables del backend en prod:**
```
BACKEND_HOST=0.0.0.0      # solo dentro de la red docker
BACKEND_PORT=7120
POCKETBASE_URL=http://pocketbase:7130
FRONTEND_ORIGIN=https://scout.midominio.com
```

### 14.5 Firewall del host

```bash
ufw allow 22/tcp
ufw deny 7110:7159/tcp
ufw enable
```

No se abre 80 ni 443 — el unico canal de entrada es Cloudflare Tunnel, que es saliente.

### 14.6 Resumen

| Entorno | Frontend | Backend | PocketBase | Acceso externo                        |
| ------- | -------- | ------- | ---------- | ------------------------------------- |
| Dev     | 7110     | 7120    | 7130       | Solo localhost                        |
| Prod    | 7110     | 7120    | 7130       | Cloudflare Tunnel + Access (1 usuario)|

---

## 15. MVP — Alcance minimo

### Incluido
- [ ] Setup de Cloudflare Tunnel + Access
- [ ] Configurar scan (subreddits, terminos, categorias, keywords)
- [ ] **Reddit Collector** (PRAW)
- [ ] **Hacker News Collector** (API publica)
- [ ] **Trends Collector** (PyTrends + SerpAPI fallback)
- [ ] **Product Hunt Collector** (GraphQL)
- [ ] Processor: limpieza, clustering TF-IDF, deteccion de senales, resumenes
- [ ] PromptBuilder con estimacion de tokens
- [ ] PromptViewer con copy to clipboard
- [ ] ResponsePaster con auto-deteccion de JSON
- [ ] ResponseParser robusto con modo editor
- [ ] Vista de reporte con oportunidades rankeadas
- [ ] Notas personales por oportunidad
- [ ] Marcar oportunidades como evaluating / building / discarded
- [ ] Export a Markdown

### Excluido del MVP
- Scans programados (APScheduler)
- Templates de configuracion reutilizables
- Comparacion entre corridas (delta de oportunidades nuevas)
- Compresion de prompt para casos > 100K tokens

### Explicitamente fuera de alcance (no se hara nunca)
- Multi-usuario
- Planes de pago / billing
- Registro publico
- Emails transaccionales
- API publica para terceros
- App movil

---

## 16. Metricas personales de exito

Las metricas no son de adopcion ni de negocio — son de utilidad personal:

| Metrica                                       | Objetivo                |
| --------------------------------------------- | ----------------------- |
| Scans completados en 3 meses                  | 10+                     |
| Oportunidades guardadas con status "building" | 1-3                     |
| Una idea efectivamente construida como SaaS   | 1 en 6-12 meses         |
| Tasa de parseo exitoso al primer intento      | > 80%                   |
| Tiempo de scan (collect + process)            | < 3 min                 |
| Tiempo total de uso por sesion                | < 20 min para revisar reporte |

El exito real no es de la app sino de los **SaaS que se construyan** a partir de las ideas descubiertas.
