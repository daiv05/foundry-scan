# F05 — Hacker News Collector

## Objetivo

Recolectar posts de Hacker News relevantes a oportunidades de micro-SaaS.

## Alcance

### API

API publica de HN (Firebase). Sin autenticacion requerida.

### Fuentes

- Top stories
- New stories
- Ask HN
- Show HN

### Filtros

- Posts con 5+ puntos
- Relacionados a SaaS, automatizacion, herramientas, productividad
- Ask HN tiene peso extra (2x en deteccion de senales, definido en F08)

### Output por post

```json
{
  "source": "hackernews",
  "title": "...",
  "url": "...",
  "score": 85,
  "num_comments": 23,
  "comments": ["...", "..."],
  "created_utc": "...",
  "type": "ask_hn",
  "pain_signals": [...],
  "demand_signals": [...]
}
```

### Manejo de errores

- API publica sin rate limit agresivo
- Si falla: scan continua con las demas fuentes, se marca HN como "sin datos"

### Almacenamiento

Resultado en `raw_data` con `source = "hackernews"`.

## Criterios de aceptacion

- [x] Consume API publica de HN
- [x] Filtra por score >= 5 y relevancia
- [x] Distingue tipo de post (ask_hn, show_hn, story)
- [x] Genera output estructurado
- [x] Guarda en `raw_data`
- [x] Funciona como tarea asincrona

## Dependencias

- F03 (backend core)
- F02 (collection raw_data)

## Ref SPEC

Seccion 5.1.2
