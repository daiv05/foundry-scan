# F14 — Opportunities Management UI

## Objetivo

Interfaz para explorar, filtrar, evaluar y anotar oportunidades descubiertas.

## Alcance

### Pagina: /opportunities — Listado

- Lista de todas las oportunidades de todos los scans
- Filtros por: `user_status` (new, evaluating, discarded, building, archived), score range
- Ordenamiento por score (default DESC)
- OpportunityCard por cada item

### Pagina: /opportunities/[id] — Detalle

- Nombre y score prominente
- ScoreBar: 4 barras horizontales (pain, trend, competencia, MVP) + total
  - Verde 8+, amarillo 5-7, rojo <5
- Problema descrito
- Evidencia con tags
- TrendBadge: flecha arriba / horizontal / abajo
- CompetitionMeter: semaforo de saturacion (verde/amarillo/rojo)
- Target user
- MVP features
- Monetizacion
- Build time estimate
- Razonamiento del LLM

### Estado y notas

- Botones para cambiar `user_status`: new → evaluating → building (o discarded/archived)
- `PATCH /api/opportunities/{id}` con nuevo status
- **NotesPanel:** campo de texto libre para notas personales (lo que pienso, decisiones, links a investigacion). Guardado automatico.

### Componentes clave

- **OpportunityCard** — nombre, score badge de color, problema, tags de evidencia, boton de estado
- **ScoreBar** — 4 barras + total con colores
- **TrendBadge** — flecha arriba/horizontal/abajo
- **CompetitionMeter** — semaforo
- **NotesPanel** — textarea con autosave

## Criterios de aceptacion

- [x] Lista todas las oportunidades con filtros y ordenamiento
- [x] Detalle muestra toda la informacion del LLM
- [x] ScoreBar con colores correctos
- [x] Cambio de status funciona y persiste
- [x] Notas personales se guardan automaticamente
- [ ] TrendBadge y CompetitionMeter visualizan datos correctamente (pendiente — F16+)

## Dependencias

- F11 (shell y routing)
- F03 (endpoints de opportunities)
- F10 (oportunidades parseadas en DB)

## Ref SPEC

Seccion 8.1 (rutas), 8.2 (componentes)
