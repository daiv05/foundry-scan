#!/bin/sh
set -e

PB_BIN="/opt/pb/pocketbase"
DATA_DIR="/pb_data"
MIGRATIONS_DIR="/opt/pb/pb_migrations"

# Auto-create superuser on first boot (idempotent — silently skips if already exists)
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
    echo "[entrypoint] Creating superuser: $PB_ADMIN_EMAIL"
    "$PB_BIN" superuser create "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" \
        --dir="$DATA_DIR" 2>/dev/null \
        && echo "[entrypoint] Superuser created." \
        || echo "[entrypoint] Superuser already exists — skipping."
fi

exec "$PB_BIN" serve \
    --http=0.0.0.0:7130 \
    --dir="$DATA_DIR" \
    --migrationsDir="$MIGRATIONS_DIR"
