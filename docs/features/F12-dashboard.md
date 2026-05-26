# F12 — Dashboard

## Objetivo

Pagina principal que muestra un resumen rapido: scans recientes, top oportunidades, y acceso a nuevo scan.

## Alcance

### Contenido

- **Scans recientes:** lista con status, fecha, numero de oportunidades encontradas
- **Top oportunidades:** las mejores oportunidades recientes (por score)
- **Boton "New Scan"** que lleva a `/scan/new`
- **Notificacion persistente** si hay un scan en estado `awaiting_llm_input`: "Tu scan semanal esta listo. Pegalo en tu LLM para continuar."

### Datos

- `GET /api/scans` (recientes)
- `GET /api/opportunities` (top por score)

### Componentes

- Lista de scans con status badge
- OpportunityCard (nombre, score con badge de color, problema resumido)
- Notificacion de scans pendientes

## Criterios de aceptacion

- [x] Muestra scans recientes con status
- [x] Muestra top oportunidades con score
- [x] Boton a nuevo scan
- [x] Notificacion visible si hay scan en `awaiting_llm_input`
- [x] Estado vacio (primer uso) con CTA claro

## Dependencias

- F11 (shell y routing)
- F03 (endpoints de scans y opportunities)

## Ref SPEC

Seccion 8.1 (ruta `/`), seccion 10 (notificacion)
