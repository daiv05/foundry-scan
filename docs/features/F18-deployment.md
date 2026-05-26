# F18 — Deployment (Cloudflare Tunnel + Access)

## Objetivo

Configurar despliegue privado en maquina personal con acceso remoto seguro via Cloudflare.

## Alcance

### Topologia

```
Internet → Cloudflare Edge (Access + Tunnel) → TLS → Maquina personal
                                                      ├── cloudflared
                                                      ├── frontend  :7110
                                                      ├── backend   :7120
                                                      └── pocketbase:7130
                                                      Bind: 127.0.0.1
```

### Cloudflare Tunnel

1. Crear tunnel en dashboard de Cloudflare Zero Trust
2. Hostname publico: `scout.midominio.com`
3. Apuntar a `http://frontend:7110` (red interna docker-compose)
4. `TUNNEL_TOKEN` en `.env`

### Cloudflare Access

- Politica: permitir solo 1 email especifico
- 2FA obligatorio
- Cualquier request sin token valido bloqueado antes de llegar a la app

### Rutas del tunnel

Una sola entrada: `scout.midominio.com` → frontend. El frontend redirige `/api/*` al backend via `next.config.js` rewrites.

### Firewall del host

```bash
ufw allow 22/tcp
ufw deny 7110:7159/tcp
ufw enable
```

No se abre 80 ni 443. El unico canal de entrada es Cloudflare Tunnel (conexion saliente).

### Variables de produccion

**Frontend:**
```
NEXT_PUBLIC_API_URL=https://scout.midominio.com/api
PORT=7110
```

**Backend:**
```
BACKEND_HOST=0.0.0.0      # dentro de red docker
BACKEND_PORT=7120
POCKETBASE_URL=http://pocketbase:7130
FRONTEND_ORIGIN=https://scout.midominio.com
```

### Backups

Cron del sistema (no APScheduler):
```bash
0 3 * * * tar -czf /backups/pb_$(date +%F).tar.gz /path/to/pb_data && \
          rclone copy /backups b2:saasscout-backups
```

### Seguridad

- Sin puertos abiertos en la maquina
- Sin IP publica expuesta
- API keys en env vars del backend, no en DB
- PocketBase admin accesible solo en red local o via tunnel
- No se almacena texto crudo de Reddit completo: solo resumenes y metadata

**No necesita:** auth interno, rate limiting publico, CORS estricto, 2FA propio, audit log.

## Criterios de aceptacion

- [ ] Tunnel creado y conecta a frontend
- [ ] Cloudflare Access bloquea requests sin autenticacion
- [ ] Solo 1 email autorizado puede acceder
- [ ] Todos los servicios bind a 127.0.0.1
- [ ] Firewall deniega acceso directo a puertos 7110-7159
- [ ] Backups diarios configurados
- [ ] Variables de produccion documentadas

## Dependencias

- F01 (docker-compose funcional)
- Todo el stack funcional (esta es la ultima feature)

## Ref SPEC

Secciones 12, 13
