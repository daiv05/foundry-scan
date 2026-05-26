# F07 — Product Hunt Collector

## Objetivo

Recolectar datos de Product Hunt para evaluar competencia y saturacion de nichos.

## Alcance

### API

GraphQL con OAuth. Token en env var `PRODUCTHUNT_TOKEN`.

### Rol

**Exclusivamente** filtro de competencia y saturacion. No se usa para descubrir oportunidades, sino para validar si un nicho ya esta saturado de productos existentes.

### Output

Datos de productos existentes por categoria/nicho que alimentan el scoring de `low_competition` en el Processor.

### Manejo de errores

| Escenario             | Accion                                           |
| --------------------- | ------------------------------------------------ |
| Product Hunt API caida | Omitir competencia, marcar como "sin datos"     |

### Almacenamiento

Resultado en `raw_data` con `source = "producthunt"`.

## Criterios de aceptacion

- [x] Conecta a Product Hunt GraphQL API
- [x] Busca productos existentes por nicho/categoria
- [x] Genera datos de competencia/saturacion
- [x] Guarda en `raw_data`
- [x] Manejo graceful si la API falla (omite fuente si `PRODUCTHUNT_TOKEN` ausente o API falla)
- [x] Funciona como tarea asincrona

## Dependencias

- F03 (backend core)
- F02 (collection raw_data)

## Ref SPEC

Seccion 5.1.4
