# F13 — Scan Flow UI

## Objetivo

Implementar el flujo completo de UI para un scan: configurar, lanzar, ver progreso, copiar prompt, pegar respuesta.

## Alcance

### Flujo

```
[1] /scan/new          → Configurar y lanzar
[2] /scan/[id]         → ScanProgress: collecting → processing
[3] /scan/[id]/prompt  → PromptViewer: copiar prompt
[4] /scan/[id]/response→ ResponsePaster: pegar respuesta
[5] /scan/[id]/report  → Reporte final (ver F15)
```

### Pagina: /scan/new

- Seleccion de subreddits (checkboxes, default activos)
- Keywords extra (opcional)
- Boton "Launch Scan"
- `POST /api/scans` y redirigir a `/scan/[id]`

### Componente: ScanProgress

Barra de progreso con estados: `collecting → processing → awaiting_llm_input → parsing → completed`

Polling o realtime (PocketBase realtime) para actualizar status automaticamente.

### Pagina: /scan/[id]/prompt — PromptViewer

- Bloque de codigo con el prompt completo
- Boton **"Copy to clipboard"**
- Contador de tokens estimado con badge de color (verde <8K, amarillo <32K, naranja <100K, rojo >100K)
- Tabla de modelos recomendados segun tamano
- Boton de descarga `.txt`
- Links rapidos a claude.ai, chatgpt.com, gemini.google.com
- Instrucciones: "1. Copia. 2. Pega en tu LLM. 3. Vuelve aqui con la respuesta."

### Pagina: /scan/[id]/response — ResponsePaster

- Textarea grande para pegar
- Auto-deteccion de bloque JSON al pegar (check verde / X rojo)
- Preview en vivo del JSON detectado
- Selector opcional: "Que LLM usaste?" (dropdown)
- Boton **"Parse & Save"**
- Si parseo falla: modo editor JSON inline con validacion en vivo
- Errores mostrados con mensajes claros (de F10)

## Criterios de aceptacion

- [x] Puede configurar y lanzar un scan desde `/scan/new`
- [x] ScanProgress actualiza status en tiempo real (polling cada 3s)
- [x] PromptViewer muestra prompt con copy-to-clipboard funcional
- [x] Estimacion de tokens con badge de color
- [x] Descarga prompt como .txt
- [x] ResponsePaster detecta JSON al pegar
- [x] Preview de validacion en vivo
- [x] Parse & Save envia a backend y redirige al reporte
- [x] Editor JSON inline si parseo falla (textarea editable con re-submit; sin syntax highlighting avanzado)

## Dependencias

- F11 (shell y routing)
- F03 (endpoints de scans, prompt, response)
- F09 (prompt generado)
- F10 (response parser)

## Ref SPEC

Secciones 8.2, 8.3
