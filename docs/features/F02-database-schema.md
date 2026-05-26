# F02 — Database Schema (PocketBase)

## Objetivo

Crear las collections de PocketBase con sus campos, relaciones e indices.

## Alcance

### Auth

Single admin user creado en setup inicial (`./pocketbase superuser create email password`). No hay collection `users` con multiples filas, ni registro publico, ni reset de password via email.

### Collection: scans

| Campo             | Tipo   | Notas                                  |
| ----------------- | ------ | -------------------------------------- |
| id                | text   | PK                                     |
| status            | select | pending / collecting / processing / awaiting_llm_input / parsing / completed / failed |
| config            | json   | configuracion del scan                 |
| prompt_text       | text   | prompt generado                        |
| prompt_tokens_est | number | estimacion de tokens                   |
| llm_response_raw  | text   | respuesta cruda pegada                 |
| llm_used          | text   | etiqueta opcional ("Claude Opus 4.7")  |
| started_at        | date   |                                        |
| processed_at      | date   | cuando termino el processor            |
| submitted_at      | date   | cuando se pego la respuesta            |
| completed_at      | date   |                                        |
| error_message     | text   |                                        |

### Collection: opportunities

| Campo        | Tipo     | Notas                                       |
| ------------ | -------- | ------------------------------------------- |
| id           | text     | PK                                          |
| scan         | relation | → scans (cascade delete)                    |
| rank         | number   |                                             |
| score        | number   | 1.0 - 10.0                                  |
| name         | text     |                                             |
| problem      | text     |                                             |
| evidence     | json     |                                             |
| scoring      | json     | 4 criterios (pain, trend, competencia, MVP) |
| target_user  | text     |                                             |
| mvp_features | json     |                                             |
| monetization | text     |                                             |
| build_time   | text     |                                             |
| reasoning    | text     |                                             |
| user_status  | select   | new / evaluating / discarded / building / archived |
| notes        | text     | notas personales sobre la idea              |
| created      | autodate |                                             |

### Collection: raw_data

| Campo        | Tipo     | Notas                                          |
| ------------ | -------- | ---------------------------------------------- |
| id           | text     | PK                                             |
| scan         | relation | → scans (cascade delete)                       |
| source       | select   | reddit / hackernews / trends / producthunt     |
| data         | json     | payload crudo                                  |
| collected_at | autodate |                                                |

### Collection: scan_configs

| Campo      | Tipo     |
| ---------- | -------- |
| id         | text     |
| name       | text     |
| config     | json     |
| is_default | bool     |
| created    | autodate |

### Indices

```
scans:         (status), (created)
opportunities: (scan), (user_status), (score DESC)
raw_data:      (scan, source)
```

Sin columna `user` en ninguna collection.

> **Nota de implementación:** Los campos `prompt_text` y `llm_response_raw` tienen el límite aumentado a 2 000 000 caracteres via migration `3_increase_text_limits.js` (PocketBase v0.38 limita text fields a 5 000 chars por defecto).

## Criterios de aceptacion

- [x] Las 4 collections existen en PocketBase con campos correctos
- [x] Relaciones scan → opportunities y scan → raw_data con cascade delete funcionan
- [x] Indices creados
- [x] Admin user creado y funcional
- [x] Migration script o setup automatizado reproducible

## Dependencias

- F01 (PocketBase corriendo)

## Ref SPEC

Seccion 6
