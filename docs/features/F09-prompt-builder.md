# F09 — Prompt Builder

## Objetivo

Construir un prompt completo y autocontenido listo para pegar en cualquier LLM externo.

## Alcance

### Input

Clusters procesados del Processor (F08) + datos de validacion (trends, competencia).

### Estructura del prompt generado

```
=== CONTEXTO ===
Rol de analista de mercado micro-SaaS.

=== DATOS ===
Clusters con resumen, post_count, demand_signals, pain_signals,
trend_data, competition.

=== INSTRUCCIONES ===
Para cada oportunidad:
- nombre, problema, evidencia con numeros
- scoring 1-10 en 4 criterios (pain 30%, trend 20%, competencia 25%, MVP 25%)
- score total ponderado
- target user, MVP features, monetizacion, build time
- razonamiento

Filtro: descartar AI chatbots genericos, AI wrappers, AI note apps,
AI coding assistants, ideas "Uber para X" sin evidencia.

=== FORMATO DE RESPUESTA ===
JSON estricto con schema definido.
```

### Estimacion de tokens

| Tamano del prompt | Modelo recomendado                    |
| ----------------- | ------------------------------------- |
| < 8K tokens       | Cualquier LLM moderno                 |
| 8K - 32K          | Claude Sonnet/Opus, GPT-4, Gemini Pro |
| 32K - 100K        | Claude (cualquiera), Gemini 1.5+      |
| > 100K            | Advertir y ofrecer modo comprimido    |

### Compresion (post-MVP)

Si el prompt es muy grande (>100K tokens), ofrecer comprimir resumenes. Excluido del MVP pero el builder debe advertir.

### Almacenamiento

- `scan.prompt_text` = prompt generado
- `scan.prompt_tokens_est` = estimacion de tokens

## Criterios de aceptacion

- [x] Genera prompt autocontenido con contexto + datos + instrucciones + formato
- [x] Estima tokens y los guarda en el scan
- [x] Guarda prompt completo en `scan.prompt_text`
- [x] Advierte si el prompt excede 100K tokens
- [x] Incluye instrucciones de formato JSON estricto en el prompt
- [x] El JSON de respuesta esperado incluye: rank, score, name, problem, evidence, scoring (4 criterios), target_user, mvp_features, monetization, build_time, reasoning

## Dependencias

- F08 (clusters procesados)
- F02 (collection scans para guardar prompt)

## Ref SPEC

Seccion 5.3
