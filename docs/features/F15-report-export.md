# F15 — Report & Export

## Objetivo

Vista de reporte final de un scan con oportunidades rankeadas y exportacion a Markdown.

## Alcance

### Pagina: /scan/[id]/report

Vista resumen del scan completado:

- Lista de oportunidades ordenadas por rank/score
- OpportunityCard por cada una con acceso rapido al detalle
- Metadata del scan: fecha, LLM usado, tiempo total, numero de oportunidades
- Link a prompt original y respuesta cruda

### Export Markdown

`GET /api/scans/{id}/export/markdown`

Genera un archivo `.md` con:

- Titulo y fecha del scan
- Tabla resumen de oportunidades (rank, score, nombre, problema)
- Detalle por oportunidad: scoring, target user, MVP features, monetizacion, build time, razonamiento
- Metadata del scan

### Export Prompt

`GET /api/scans/{id}/export/prompt.txt`

Descarga el prompt generado como archivo `.txt`.

## Criterios de aceptacion

- [x] Reporte muestra oportunidades rankeadas con scores
- [x] Metadata del scan visible
- [x] Export markdown genera un archivo .md completo y legible
- [x] Export prompt descarga .txt
- [x] Botones de descarga en la UI del reporte

## Dependencias

- F11 (routing)
- F13 (scan flow — llega a report tras completar)
- F03 (endpoints de export)
- F10 (oportunidades en DB)

## Ref SPEC

Seccion 8.1 (ruta /scan/[id]/report), seccion 7.1 (endpoints export)
