# F04 — Reddit Collector

## Objetivo

Recolectar posts y comentarios de Reddit que contengan senales de dolor o demanda real de herramientas SaaS.

## Alcance

### Libreria

**Playwright** (scraping de `old.reddit.com`). Sin credenciales — acceso publico anónimo.

> **Cambio de implementación:** El diseño original usaba PRAW (OAuth2 con `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`). La implementación real usa Playwright para hacer scraping de `old.reddit.com` sin necesidad de app registration ni credenciales. Variables de entorno `REDDIT_CLIENT_ID` y `REDDIT_CLIENT_SECRET` no existen.

### Variables de entorno relevantes

```
REDDIT_REQUEST_DELAY_MS=2000   # pausa entre requests (ms)
REDDIT_FETCH_COMMENTS=true     # si se deben traer comentarios
```

### Subreddits

**Por defecto:** r/SaaS, r/Entrepreneur, r/smallbusiness, r/freelance, r/webdev

Configurables desde la app (via config del scan).

### Keywords de dolor

```
pain, workflow, manual, expensive, spreadsheet, automation,
hate this tool, waste time, repetitive, tedious, frustrated,
broken, annoying, slow, overpriced
```

### Keywords de demanda real (willingness-to-pay)

```
I'd pay for, shut up and take my money, is there a tool that,
looking for a solution, willing to pay, I need something that,
does anyone know a tool, recommendation for, take my money,
would pay good money
```

### Output por post

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

### Manejo de errores

- Rate limit / bloqueo de Reddit: retry con backoff exponencial (max 3 intentos) + delay configurable
- Si falla completamente: scan continua con las demas fuentes, se marca Reddit como "sin datos"

### Almacenamiento

Resultado guardado en collection `raw_data` con `source = "reddit"`, vinculado al `scan_id`.

## Criterios de aceptacion

- [x] Scrapea Reddit via Playwright sin necesidad de credenciales de API
- [x] Busca en subreddits configurados
- [x] Detecta pain signals y demand signals en titulo, body y comentarios
- [x] Genera output estructurado por post
- [x] Guarda resultados en `raw_data`
- [x] Retry con backoff en rate limit
- [x] Funciona como tarea asincrona dentro del pipeline del scan

## Dependencias

- F03 (backend core, scan service)
- F02 (collection raw_data)

## Ref SPEC

Seccion 5.1.1
