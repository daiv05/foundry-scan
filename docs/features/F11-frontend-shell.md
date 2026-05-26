# F11 — Frontend Shell & Layout

## Objetivo

Establecer la estructura base del frontend Next.js: layout, navegacion, routing y componentes compartidos.

## Alcance

### Paginas (rutas)

| Ruta                  | Pagina            | Descripcion                            |
| --------------------- | ----------------- | -------------------------------------- |
| /                     | Dashboard         | Scans recientes, top opportunities     |
| /scan/new             | Nuevo Scan        | Configurar y lanzar                    |
| /scan/[id]            | Detalle Scan      | Progreso, prompt o reporte segun estado|
| /scan/[id]/prompt     | Prompt Viewer     | Prompt listo para copiar               |
| /scan/[id]/response   | Response Paster   | Textarea para pegar respuesta          |
| /scan/[id]/report     | Reporte           | Reporte final                          |
| /opportunities        | Listado           | Filtros y estados                      |
| /opportunities/[id]   | Detalle           | Detalle + notas personales             |
| /settings             | Configuracion     | API keys, templates                    |

**No hay `/login` ni `/signup`.** Cloudflare Access maneja auth antes de cargar la app.

### Layout

- Sidebar o top nav con links a Dashboard, Opportunities, Settings
- Sin sistema de auth/sesion en el frontend

### Tecnologia

- Next.js (App Router)
- Tailwind CSS para styling
- Fetch a `/api/*` (rewrite a backend via next.config.js)

## Criterios de aceptacion

- [x] Todas las rutas existen (pueden estar vacias/placeholder)
- [x] Layout con navegacion funcional
- [x] Tailwind CSS configurado
- [x] Fetch a `/api/health` funciona desde el frontend

## Dependencias

- F01 (frontend corriendo)

## Ref SPEC

Seccion 8.1
