# Production Setup

Two deployment options are covered here:

- **Option A - Nginx reverse proxy** - recommended for a VPS or dedicated server with a public IP
- **Option B - Cloudflare Tunnel** - recommended when you don't have a public IP, or want zero-config TLS and Cloudflare Access authentication

Both options assume the Docker Compose stack is running on the server.

---

## Common first steps (both options)

### 1. Clone and configure on the server

```bash
git clone https://github.com/daiv05/foundry-scan.git
cd foundry-scan

cp .env.example          .env
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Set credentials and public URLs

Edit the root `.env` - used by Docker Compose to initialize the PocketBase admin account:

```bash
PB_ADMIN_EMAIL=you@yourdomain.com
PB_ADMIN_PASSWORD=<strong-random-password>
```

Edit `backend/.env` - used by FastAPI to authenticate against PocketBase at runtime:

```bash
PB_ADMIN_EMAIL=you@yourdomain.com           # must match root .env
PB_ADMIN_PASSWORD=<strong-random-password>  # must match root .env
FRONTEND_ORIGIN=https://yourdomain.com      # must match the public frontend URL
```

> **PocketBase credentials:** the admin account is created automatically on first boot by the container entrypoint using the values from the root `.env`. The values in `backend/.env` must be identical - FastAPI uses them to authenticate every request. If you ever change the password, update both files and restart both containers (or change it via the PocketBase admin UI first, then update both files).

### 3. Start the stack in production mode

The services bind to `127.0.0.1` by default, so they are only reachable from the same machine. The reverse proxy or tunnel reaches them locally.

Use the `-f` flag to load **only** `docker-compose.yml`, skipping the dev override:

```bash
docker compose -f docker-compose.yml up -d --build
```

> **Why `-f`?** Without it, Docker Compose automatically loads `docker-compose.override.yml`, which enables the Next.js dev server and uvicorn `--reload`. In production you want the built Next.js app (`npm start`) and uvicorn without reload.

---

## Option A - Nginx reverse proxy

### Prerequisites

- A server with a public IP
- A domain pointing to that IP
- `nginx` and `certbot` installed

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

### 1. Create the Nginx site config

Create `/etc/nginx/sites-available/foundryscan`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Let Certbot handle HTTPS upgrade
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options          DENY;
    add_header X-Content-Type-Options   nosniff;
    add_header Referrer-Policy          same-origin;
    add_header Permissions-Policy       "geolocation=(), camera=(), microphone=()";

    # Frontend (Next.js)
    location / {
        proxy_pass         http://127.0.0.1:7110;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Backend API - proxied under /api so the browser hits the same origin
    location /api/ {
        proxy_pass         http://127.0.0.1:7120/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;   # collection can take up to 10 min - raise if needed
        client_max_body_size 10M;
    }

    # PocketBase admin (optional - restrict to your IP in production)
    location /pb/ {
        proxy_pass         http://127.0.0.1:7130/;
        proxy_http_version 1.1;
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        # Uncomment to restrict access to your IP only:
        # allow 1.2.3.4;
        # deny all;
    }
}
```

### 2. Enable the site and get a certificate

```bash
sudo ln -s /etc/nginx/sites-available/foundryscan /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

### 3. Auto-renew TLS

Certbot installs a systemd timer automatically. Verify it:

```bash
sudo systemctl status certbot.timer
```

---

## Option B - Cloudflare Tunnel

Cloudflare Tunnel creates an outbound-only encrypted connection from your server to Cloudflare's edge - no open ports required. Cloudflare terminates TLS at the edge; all ingress services must use `http://` pointing to local ports.

### Prerequisites

- A domain managed by Cloudflare (free plan works)
- A Cloudflare account

### 1. Install `cloudflared`

```bash
# Debian / Ubuntu
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
  https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update && sudo apt install cloudflared
```

Other platforms: [developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

### 2. Authenticate and create the tunnel

```bash
cloudflared tunnel login          # opens browser - authorise your domain
cloudflared tunnel create foundryscan
```

Note the **Tunnel ID** printed after creation.

### 3. Configure the tunnel

Create `~/.cloudflared/config.yml`. Use `http://` for every service — **never `https://`**; the backend and PocketBase don't serve TLS, and using `https://` will cause `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` in the browser:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: yourdomain.com
    service: http://localhost:7110

  - hostname: api.yourdomain.com
    service: http://localhost:7120

  - hostname: pb.yourdomain.com
    service: http://localhost:7130

  # Catch-all required by cloudflared
  - service: http_status:404
```

> The `api.` and `pb.` subdomains are optional. If you only expose the frontend, the Next.js rewrite (`/api/*` → backend) handles all API traffic internally, so the browser never needs to reach the backend directly.

### 4. Route DNS to the tunnel

```bash
cloudflared tunnel route dns foundryscan yourdomain.com
cloudflared tunnel route dns foundryscan api.yourdomain.com
cloudflared tunnel route dns foundryscan pb.yourdomain.com
```

### 5. Run as a system service

```bash
sudo cloudflared service install
sudo systemctl start  cloudflared
sudo systemctl enable cloudflared
sudo systemctl status cloudflared
```

### 6. Update env vars and restart

In `backend/.env`:

```bash
FRONTEND_ORIGIN=https://yourdomain.com
```

Then apply:

```bash
docker compose -f docker-compose.yml up -d --force-recreate backend
```

### 7. (Optional) Restrict access with Cloudflare Access

To require login before reaching your FoundryScan instance:

1. Go to **Cloudflare Zero Trust → Access → Applications**
2. Click **Add an application → Self-hosted**
3. Set the application domain to `yourdomain.com`
4. Configure an identity provider (GitHub, Google, email OTP, etc.)
5. Add a policy - e.g. "Allow email ends with @yourdomain.com"

No code changes are needed; Cloudflare enforces authentication at the edge before any request reaches your server.

---

## Keeping FoundryScan updated

```bash
git pull
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d --force-recreate
```

If migrations were added (check `pocketbase/pb_migrations/` in the diff), rebuild PocketBase first:

```bash
docker compose -f docker-compose.yml build pocketbase
docker compose -f docker-compose.yml up -d --force-recreate pocketbase
docker compose -f docker-compose.yml up -d --force-recreate backend   # re-auth after PB restart
```
