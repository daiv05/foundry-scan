# F17 — Error Handling & Resilience

## Objetivo

Implementar manejo robusto de errores en todo el pipeline, con retries, fallbacks y timeouts.

## Alcance

### Errores por componente

| Escenario                     | Comportamiento                                          |
| ----------------------------- | ------------------------------------------------------- |
| Reddit API rate limit         | Retry con backoff exponencial (max 3)                   |
| PyTrends falla                | Fallback automatico a SerpAPI                           |
| SerpAPI cuota agotada         | Omitir trends, marcar fuente como "sin datos"           |
| Product Hunt API caida        | Omitir competencia, marcar fuente como "sin datos"      |
| Scan excede 10 min en collect | Timeout, status = `failed`                              |
| Prompt muy grande (>100K)     | Ofrecer modo comprimido (advertencia)                   |
| Respuesta LLM no parseable   | Retry asistido con editor JSON                          |
| Texto sin JSON                | Instrucciones + ejemplo de formato                      |

### Principios

- **Degradacion graceful:** si una fuente falla, el scan continua con las demas. Se marca que fuente no contribuyo datos.
- **Timeout global:** 10 minutos para la fase de collecting. Si se excede, `scan.status = 'failed'` con `error_message` descriptivo.
- **Backoff exponencial:** para APIs con rate limit (Reddit especialmente).
- **Errores visibles:** el usuario siempre ve que salio mal, no errores silenciosos.

### Scan failed state

Cuando un scan falla:
- `scan.status = 'failed'`
- `scan.error_message` con descripcion legible
- La UI muestra el error con opcion de reintentar

### Expiracion de raw_data

Si pasan 30 dias sin que el usuario complete un scan en `awaiting_llm_input`, el `raw_data` se elimina automaticamente. El prompt sigue accesible.

## Criterios de aceptacion

- [ ] Reddit retry con backoff funciona
- [ ] Fallback PyTrends → SerpAPI funciona
- [ ] Fuentes fallidas se marcan correctamente, no rompen el scan
- [ ] Timeout de 10 min en collecting
- [ ] Error messages legibles en scan failed
- [ ] UI muestra errores con opcion de retry
- [ ] raw_data se expira tras 30 dias sin completar

## Dependencias

- F04-F07 (collectors)
- F10 (response parser errors)
- F03 (scan status management)

## Ref SPEC

Secciones 10 (expiracion), 11 (errores)
