#!/usr/bin/env bash
# Forti Member App - full timestamped backup of code + PostgreSQL DB.
# Usage: ./scripts/backup.sh [reason]
set -euo pipefail

APP_DIR="/var/www/forti-member-app"
BACKUP_ROOT="/home/ubuntu/backups/forti-member-app"
PM2_NAME="forti-member-app"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
TAG="${1:-snapshot}"
DEST="$BACKUP_ROOT/${TS}_${TAG}"

LATEST="$(ls -1 "$BACKUP_ROOT" 2>/dev/null | sort | tail -n 1 || true)"
if [ -n "$LATEST" ] && [[ "$TS" < "${LATEST%%_*}" ]]; then
  echo "WARN: a newer backup ($LATEST) already exists. Continuing anyway in 5s..."
  sleep 5
fi

mkdir -p "$DEST"
echo "[backup] target=$DEST"

WAS_RUNNING=false
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  if pm2 jlist | python3 -c "import json,sys; apps=json.load(sys.stdin); print(next((a['pm2_env']['status'] for a in apps if a.get('name')=='$PM2_NAME'), 'stopped'))" | grep -q online; then
    WAS_RUNNING=true
  fi
fi

echo "[backup] stopping pm2 $PM2_NAME..."
pm2 stop "$PM2_NAME" >/dev/null 2>&1 || true

set -a
# shellcheck disable=SC1091
source "$APP_DIR/backend/.env"
set +a

DB_PORT="${DB_PORT:-5432}"
echo "[backup] dumping database $DB_NAME..."
PGPASSWORD="${DB_PASS:-${DB_PASSWORD:-}}" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl | gzip -9 > "$DEST/db.sql.gz"

echo "[backup] archiving code..."
tar --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./*.pem' \
    --exclude='./frontend/node_modules' \
    --exclude='./backend/node_modules' \
    -czf "$DEST/code.tar.gz" -C "$APP_DIR" .

sudo cp /etc/nginx/sites-available/forti-member-app.kaitensoftware.conf \
  "$DEST/nginx.forti-member-app.kaitensoftware.conf" 2>/dev/null || true

if [ "$WAS_RUNNING" = true ]; then
  echo "[backup] resuming pm2 $PM2_NAME..."
  pm2 start "$PM2_NAME" >/dev/null 2>&1 || pm2 restart "$PM2_NAME" >/dev/null
fi

cat > "$DEST/restore.sh" <<'RSH'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="/var/www/forti-member-app"
BACKUP_ROOT="/home/ubuntu/backups/forti-member-app"
PM2_NAME="forti-member-app"

THIS_NAME="$(basename "$HERE")"
LATEST="$(ls -1 "$BACKUP_ROOT" 2>/dev/null | sort | tail -n 1 || true)"
if [ -n "$LATEST" ] && [ "$LATEST" != "$THIS_NAME" ]; then
  echo "WARN: a newer backup ($LATEST) exists. Restoring an OLDER backup ($THIS_NAME)."
  read -r -p "Type RESTORE to continue: " confirm
  [ "$confirm" = "RESTORE" ] || { echo "Aborted."; exit 1; }
fi

echo "[restore] stopping pm2 $PM2_NAME..."
pm2 stop "$PM2_NAME" >/dev/null 2>&1 || true

echo "[restore] restoring code from code.tar.gz..."
TMP="$(mktemp -d)"
tar -xzf "$HERE/code.tar.gz" -C "$TMP"
[ -f "$APP_DIR/backend/.env" ] && cp "$APP_DIR/backend/.env" "$TMP/backend/.env"
rsync -a --delete \
  --exclude=node_modules \
  --exclude=frontend/node_modules \
  --exclude=backend/node_modules \
  --exclude=.git \
  "$TMP"/ "$APP_DIR"/
rm -rf "$TMP"

echo "[restore] reinstalling dependencies..."
( cd "$APP_DIR/backend" && npm ci --omit=dev --no-audit --no-fund )
( cd "$APP_DIR/frontend" && npm ci --include=dev --no-audit --no-fund && npm run build )
( cd "$APP_DIR/frontend" && npm prune --omit=dev 2>/dev/null || true )

echo "[restore] restoring database from db.sql.gz..."
set -a
# shellcheck disable=SC1091
source "$APP_DIR/backend/.env"
set +a
DB_PORT="${DB_PORT:-5432}"
gunzip -c "$HERE/db.sql.gz" | PGPASSWORD="${DB_PASS:-${DB_PASSWORD:-}}" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1

echo "[restore] starting pm2 $PM2_NAME..."
pm2 restart "$PM2_NAME" >/dev/null 2>&1 || pm2 start "$APP_DIR/backend/src/app.js" --name "$PM2_NAME" --cwd "$APP_DIR/backend"
pm2 save >/dev/null
echo "[restore] done."
sleep 2
curl -s -o /dev/null -w "health: HTTP %{http_code}\n" http://127.0.0.1:5031/api/health || true
RSH
chmod +x "$DEST/restore.sh"

du -sh "$DEST"/* 2>/dev/null || true
echo "[backup] OK -> $DEST"
