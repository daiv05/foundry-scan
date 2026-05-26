# F06 — Trends Collector

## Objetivo

Recolectar datos de tendencias de Google Trends para validar crecimiento de interes en nichos detectados.

## Alcance

### Fuentes

1. **Primario:** PyTrends (libreria Python para Google Trends)
2. **Fallback:** Playwright (scraping directo de trends.google.com)

> **Cambio de implementación:** El diseño original usaba SerpAPI como fallback. La implementación real usa Playwright para hacer scraping de Google Trends si PyTrends falla. La variable de entorno `SERPAPI_KEY` no existe en el proyecto.

### Variables de entorno relevantes

```
TRENDS_GEO=US            # región para Google Trends
TRENDS_TIMEFRAME=today 3-m  # ventana temporal
```

### Logica de fallback

Si PyTrends falla (bloqueo, rate limit, cambio de API), usar Playwright para obtener los mismos datos. Sin intervencion del usuario.

### Output

Datos de tendencia por keyword/nicho que alimentan el scoring de trend_growth en el Processor.

### Manejo de errores

| Escenario                  | Accion                                        |
| -------------------------- | --------------------------------------------- |
| PyTrends falla             | Fallback automatico a Playwright              |
| Playwright también falla   | Omitir trends, marcar fuente como "sin datos" |

### Almacenamiento

Resultado en `raw_data` con `source = "trends"`.

### Credenciales

- PyTrends: sin credenciales (API no oficial)
- Playwright fallback: sin credenciales (scraping público)

## Criterios de aceptacion

- [x] Consulta Google Trends via PyTrends
- [x] Fallback automatico a Playwright si PyTrends falla
- [x] Manejo graceful si ambas fuentes fallan
- [x] Guarda en `raw_data`
- [x] Funciona como tarea asincrona

## Dependencias

- F03 (backend core)
- F02 (collection raw_data)

## Ref SPEC

Seccion 5.1.3
