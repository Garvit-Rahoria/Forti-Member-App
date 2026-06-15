#!/usr/bin/env bash
# Forti Member App - Deployment Script
# Usage:
#   ./deploy.sh fresh      First-time setup (requires backend/.env)
#   ./deploy.sh update     Pull code, rebuild, restart (preserves DB data)
#   ./deploy.sh db-reset   Re-apply schema + seed (DESTROYS DATA)
set -euo pipefail

APP_DIR="/var/www/forti-member-app"
PM2_NAME="forti-member-app"
APP_PORT="${APP_PORT:-5031}"
DOMAIN="${DOMAIN:-forti-member-app.kaitensoftware.com}"
GIT_SSH="${DEPLOY_GIT_SSH:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

load_env() {
  if [ -f "$APP_DIR/backend/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$APP_DIR/backend/.env"
    set +a
  fi
}

run_backup() {
  local reason="${1:-predeploy}"
  if [ -f "$APP_DIR/scripts/backup.sh" ]; then
    bash "$APP_DIR/scripts/backup.sh" "$reason"
  else
    warn "backup.sh not found — skipping backup"
  fi
}

install_deps_and_build() {
  cd "$APP_DIR/backend"
  npm install --omit=dev --no-audit --no-fund
  cd "$APP_DIR/frontend"
  npm install --include=dev --no-audit --no-fund
  npm run build
  npm prune --omit=dev 2>/dev/null || true
  log "Frontend built to frontend/dist"
}

start_pm2() {
  pm2 delete "$PM2_NAME" 2>/dev/null || true
  pm2 start "$APP_DIR/backend/src/app.js" \
    --name "$PM2_NAME" \
    --cwd "$APP_DIR/backend"
  pm2 save
  log "PM2 process $PM2_NAME started on port ${PORT:-$APP_PORT}"
}

setup_postgres() {
  load_env
  [ -n "${DB_PASS:-}" ] || err "DB_PASS not set in backend/.env"
  local db_pass_escaped="${DB_PASS//\'/\'\'}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'forti-member-app') THEN
    CREATE ROLE "forti-member-app" LOGIN PASSWORD '${db_pass_escaped}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE "forti-member-app" OWNER "forti-member-app"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'forti-member-app')\gexec
GRANT ALL PRIVILEGES ON DATABASE "forti-member-app" TO "forti-member-app";
SQL
  log "PostgreSQL database and user ready"
}

apply_schema() {
  cd "$APP_DIR/backend"
  load_env
  NODE_PATH="$APP_DIR/backend/node_modules" node "$APP_DIR/database/setup.js"
  log "Database schema and seed applied"
}

apply_extra_schema() {
  load_env
  PGPASSWORD="${DB_PASS:-}" psql -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-5432}" -U "${DB_USER:-forti-member-app}" -d "${DB_NAME:-forti-member-app}" -v ON_ERROR_STOP=1 \
    -f "$APP_DIR/database/init/06-token-blacklist.sql" \
    -f "$APP_DIR/database/init/07-portal-branches.sql" 2>/dev/null || true
  cd "$APP_DIR/backend" && node create_table.js 2>/dev/null || true
  log "Extra schema patches applied"
}

set_admin_credentials() {
  load_env
  if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    warn "ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin credential seed"
    return
  fi
  cd "$APP_DIR/backend"
  ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node -e "
const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/database');
(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const hash = await bcrypt.hash(password, 10);
  const [[row]] = await pool.query(\"SELECT id FROM portal_admin_users WHERE role = 'super_admin' ORDER BY id LIMIT 1\");
  if (row) {
    await pool.query(
      'UPDATE portal_admin_users SET email = ?, password_hash = ?, full_name = ?, is_active = 1 WHERE id = ?',
      [email, hash, 'Admin', row.id]
    );
  } else {
    await pool.query(
      \"INSERT INTO portal_admin_users (uuid, full_name, email, password_hash, role, is_active) VALUES (gen_random_uuid()::text, 'Admin', ?, ?, 'super_admin', 1)\",
      [email, hash]
    );
  }
  console.log('Admin user configured for', email);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
"
  log "Admin credentials configured"
}

ensure_env_files() {
  if [ ! -f "$APP_DIR/backend/.env" ]; then
    if [ -f "$APP_DIR/backend/.env.example" ]; then
      cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
    fi
    err "Configure backend/.env before running fresh deploy (see backend/.env.example)"
  fi
  if [ ! -f "$APP_DIR/frontend/.env.production" ]; then
    if [ -f "$APP_DIR/frontend/.env.production.example" ]; then
      cp "$APP_DIR/frontend/.env.production.example" "$APP_DIR/frontend/.env.production"
      log "frontend/.env.production created from example"
    fi
  fi
  load_env
  if [ -z "${JWT_SECRET:-}" ] || [ "$JWT_SECRET" = "change-me-in-production" ]; then
    JWT_SECRET="$(openssl rand -hex 32)"
    if grep -q '^JWT_SECRET=' "$APP_DIR/backend/.env"; then
      sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$APP_DIR/backend/.env"
    else
      echo "JWT_SECRET=$JWT_SECRET" >> "$APP_DIR/backend/.env"
    fi
    log "Generated JWT_SECRET in backend/.env"
  fi
}

configure_git() {
  cd "$APP_DIR"
  if [ -n "$GIT_SSH" ]; then
    git config core.sshCommand "$GIT_SSH"
    log "Git SSH configured"
  fi
}

git_pull() {
  if [ -n "$GIT_SSH" ]; then
    GIT_SSH_COMMAND="$GIT_SSH" git pull origin main
  else
    git pull origin main
  fi
}

MODE="${1:-update}"

case "$MODE" in
fresh)
  echo "=========================================="
  echo "  FORTI MEMBER APP - FRESH DEPLOYMENT"
  echo "=========================================="

  if [ ! -d "$APP_DIR/.git" ]; then
    err "Clone repo to $APP_DIR first"
  fi

  configure_git
  ensure_env_files
  setup_postgres
  install_deps_and_build
  apply_schema
  apply_extra_schema
  set_admin_credentials
  start_pm2

  if [ ! -f "/etc/nginx/sites-enabled/forti-member-app.kaitensoftware.conf" ]; then
    warn "Enable nginx config: sudo ln -sf /etc/nginx/sites-available/forti-member-app.kaitensoftware.conf /etc/nginx/sites-enabled/"
  fi

  echo ""
  log "FRESH DEPLOYMENT COMPLETE"
  echo "  URL:  https://$DOMAIN"
  echo "  API:  http://127.0.0.1:${PORT:-$APP_PORT}/api/health"
  ;;

update)
  echo "=========================================="
  echo "  FORTI MEMBER APP - UPDATE DEPLOYMENT"
  echo "=========================================="

  cd "$APP_DIR" || err "App directory not found"
  configure_git
  run_backup "predeploy"

  git stash push -m "deploy-stash-$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
  git_pull
  log "Code pulled from git"

  install_deps_and_build
  apply_extra_schema
  pm2 restart "$PM2_NAME"
  log "Server restarted"

  echo ""
  log "UPDATE DEPLOYMENT COMPLETE"
  ;;

db-reset)
  echo "=========================================="
  echo "  FORTI MEMBER APP - DATABASE RESET"
  echo "  ⚠️  THIS WILL DELETE ALL DATA!"
  echo "=========================================="

  cd "$APP_DIR" || err "App directory not found"
  run_backup "pre-db-reset"
  load_env

  read -r -p "Type yes to reset database: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
  fi

  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO "forti-member-app";'

  apply_schema
  apply_extra_schema
  set_admin_credentials
  pm2 restart "$PM2_NAME"
  log "DATABASE RESET COMPLETE"
  ;;

*)
  echo "Usage: $0 {fresh|update|db-reset}"
  exit 1
  ;;
esac
