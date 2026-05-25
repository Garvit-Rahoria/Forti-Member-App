# FORTI Member App — Local Dev Runbook

## Ports
| Service  | Port  |
|----------|-------|
| Frontend | 3000  |
| Backend  | 5001  |
| MySQL DB | 3308  |

## 1. Start MySQL (Docker)
```bash
docker start forti_db
# First time setup:
# docker compose up -d
```

## 2. Start Backend
```bash
cd backend
node src/app.js
```

## 3. Start Frontend
```bash
cd frontend
npm run dev
```

## One-liner (run all)
```bash
docker start forti_db && \
  sleep 3 && \
  (cd backend && node src/app.js &) && \
  (cd frontend && npm run dev)
```

## Kill all & restart
```bash
lsof -ti :5001 | xargs kill -9 2>/dev/null
lsof -ti :3000 | xargs kill -9 2>/dev/null
docker start forti_db
sleep 3
(cd backend && node src/app.js &)
(cd frontend && npm run dev)
```

## Admin Login
| Field    | Value              |
|----------|--------------------|
| URL      | http://localhost:3000/admin |
| Email    | admin@forti.org    |
| Password | Admin@12345        |
| Role     | super_admin        |

## Member Portal
- URL: http://localhost:3000

## DB Access (direct)
```bash
docker exec -it forti_db mysql -uforti -p'forti@2026' forti_membership
```

## Fix duplicate payment methods / durations
```bash
# Deduplicate durations
docker exec forti_db mysql -uforti -p'forti@2026' forti_membership -e "
DELETE d1 FROM durations d1
INNER JOIN durations d2
  ON d1.label = d2.label AND d1.type = d2.type AND d1.sort_order = d2.sort_order
  AND d1.id > d2.id;"

# Deduplicate payment methods
docker exec forti_db mysql -uforti -p'forti@2026' forti_membership -e "
DELETE p1 FROM portal_payment_methods p1
INNER JOIN portal_payment_methods p2
  ON p1.name = p2.name AND p1.type = p2.type
  AND p1.id > p2.id;"
```

## Run DB Migrations (if needed)
```bash
# From repo root
for f in database/migration_v{2..29}.sql; do
  echo "Running $f..."
  docker exec -i forti_db mysql -uforti -p'forti@2026' forti_membership < "$f" 2>&1 | grep -v Warning
done
```

## Reset Admin Password
```bash
cd backend
node -e "
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
(async () => {
  const hash = await bcrypt.hash('Admin@12345', 10);
  const c = await mysql.createConnection({host:'127.0.0.1',port:3308,user:'forti',password:'forti@2026',database:'forti_membership'});
  await c.query('UPDATE portal_admin_users SET password_hash=? WHERE email=?', [hash,'admin@forti.org']);
  console.log('Done — password is Admin@12345');
  await c.end();
})().catch(console.error);
"
```

## Environment
- Backend `.env` → `backend/.env`
- DB port changed from 3307 → **3308** (3307 was taken by another container)
- macOS port 5000 is used by Control Center → backend runs on **5001**
