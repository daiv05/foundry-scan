# F10 — Response Parser

## Objetivo

Recibir la respuesta cruda del LLM pegada por el usuario y convertirla en oportunidades estructuradas.

## Alcance

### Pipeline de parseo

1. **Extraer bloque JSON:** buscar ` ```json ... ``` `; fallback: primer `{ ... }` balanceado
2. **Reparar JSON malformado:** trailing commas, comillas simples, comentarios `//`
3. **Validar schema** con Pydantic
4. **Validar valores:** scores en [1, 10], rank unico, campos requeridos
5. **Recalcular score ponderado** en backend (no confiar en el total del LLM)
   - Pesos: pain 30%, trend 20%, competencia 25%, MVP 25%
6. **Insertar oportunidades** vinculadas al `scan_id`

### Input

```json
{
  "response_text": "```json\n{ \"opportunities\": [...] }\n```",
  "llm_used": "Claude Opus 4.7"
}
```

### Manejo de errores

| Error                              | Accion                                     |
| ---------------------------------- | ------------------------------------------ |
| No se encuentra bloque JSON        | Mostrar instrucciones de formato + retry   |
| JSON invalido                      | Intentar reparacion; si falla, retry       |
| Schema invalido (campos faltantes) | Mostrar diff de lo que falta + retry       |
| Score fuera de rango               | Auto-clamp a [1, 10] + advertencia visible |
| Cero oportunidades                 | Pedir confirmacion antes de guardar        |

### Modo asistido

Si el parseo falla, ofrecer editor JSON con validacion en vivo (el frontend lo muestra, ver F13).

### Almacenamiento

- `scan.llm_response_raw` = respuesta cruda
- `scan.llm_used` = etiqueta del LLM
- `scan.submitted_at` = timestamp
- `scan.status` = `parsing` → `completed`
- Oportunidades insertadas en collection `opportunities`

### Endpoint retry

`POST /api/scans/{id}/response/retry` reprocesa la misma respuesta cruda guardada, util si se corrigio manualmente.

## Criterios de aceptacion

- [x] Extrae JSON de ` ```json ``` ` y de `{ }` balanceado
- [x] Repara trailing commas, comillas simples, comentarios
- [x] Valida schema con Pydantic
- [x] Clampea scores fuera de rango y genera advertencia
- [x] Recalcula score ponderado (no usa el del LLM)
- [x] Inserta oportunidades en PocketBase
- [x] Actualiza scan status a `completed`
- [x] Retry funciona reprocesando la respuesta guardada
- [x] Errores devuelven mensajes claros y accionables

## Dependencias

- F03 (endpoints de response)
- F02 (collections scans y opportunities)

## Ref SPEC

Seccion 5.4
