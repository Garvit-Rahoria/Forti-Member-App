
## 1. Server & Access

| Item               | Value                                              |
|--------------------|-----------------------------------------------------|
| **Domain**         | https://forti-member-app.kaitensoftware.com                  |
| **Server IP**      | 3.111.120.235 (AWS)                                 |
| **SSH**            | `ssh -i  koristu-dev-26.pem	 ubuntu@3.111.120.235`      |
| **PEM file**       | above mentioned (project root — git-ignored)     |
| **App directory**  | `/var/www/forti-member-app`                                   |
| **App port**       | decide a new one on initial install and then maintain                                               |
| **PM2 process**    | `forti-member-app` (id 9)                                |
| **Nginx config**   | `/etc/nginx/sites-available/forti-member-app.kaitensoftware.conf` |

---

## 2. Repository

| Item      | Value                                                       |
|-----------|--------------------------------------------------------------|
| **Repo**  | https://github.com/kaiten-software/forti-member-app.git      |
| **Branch**| `main`                                                       |

---

## 3. Database Credentials

| Item                | Value                        |
|---------------------|-------------------------------|
| **MariaDB version** | 10.11                         |
| **Database**        | `forti-member-app`                 |
| **DB User**         | `forti-member-app`                |
| **DB Password**     | `Fb9xKpmQ2wR7vLznYs`         |

---

## 4. Application Credentials

| Item                | Value                        |
|---------------------|-------------------------------|
| **Admin email**     | `admin`          |
| **Admin password**  | `admin@321`                    |



---

## 5. Deployment — Quick Reference

### Fresh Deploy (first time)
```bash
# On server:
cd /var/www
git clone https://github.com/kaiten-software/forti-member-app.git forti-member-app
cd forti-member-app

# Copy .env.example → .env and fill in credentials (see section 3 above)
cp .env.example .env
nano .env

# Run the deploy script
chmod +x deploy.sh
./deploy.sh fresh
```

### Update Deploy (code changes only)
```bash
ssh -i  koristu-dev-26.pem   ubuntu@3.111.120.235
cd /var/www/forti-member-app
./deploy.sh update
```

### Database Reset (wipe & re-seed)
```bash
cd /var/www/forti-member-app
./deploy.sh db-reset
```

---

## 6. Key Files for Deployment

| File                  | Purpose                                        |
|-----------------------|------------------------------------------------|
| `database/schema.sql` | Complete DB schema (21 tables + 1 view)        |
| `database/seed.sql`   | Default admin user + party settings            |
| `deploy.sh`           | One-command deployment (fresh / update / reset) |
| `.env.example`        | Environment variable template                  |

---

## 7. Important Rules

1. **Bare metal only** — do NOT use Docker
2. **Dedicated resources** — use ports, DB users, and configs specific to this app only; do NOT conflict with other projects on the same server
3. **Always back up** the database before deploying to production (`deploy.sh` does this automatically)
4. **Schema changes** must be reflected in `database/schema.sql` and committed to git
5. **Nginx** uses a separate config file for this site — do not modify the default Nginx config
6. **SSL** is managed via Let's Encrypt / certbot for `forti-member-app.kaitensoftware.com`

---

## 8. Nginx Config (reference)

```nginx
server {
    server_name forti-member-app.kaitensoftware.com;

    location / {
        proxy_pass http://127.0.0.1:5030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL managed by certbot
}
```

---

## 9. PM2 Commands

```bash
pm2 status                    # Check all processes
pm2 restart forti-member-app       # Restart the app
pm2 logs forti-member-app          # View logs
pm2 logs forti-member-app --lines 50  # Last 50 lines
```


-----------


Before you make any change - either file of DB - 
always take a FULL backup of files on aws server under /home/ubuntu/backups - create a folder for the app under this folder and then create the folder for timestamp - under that create zip of the entire code of the app and another zi of the respective database. In this file also create a shell script that I should be able to execute to restore the backup in one go immmediately. also out a check in this shell file - if there is a newer backup - then warn me - also before you start backing up - bring the site temporarily down

--- do not change anything outside of the scope of the app

---- make sure that in the update process - do not lose original prod data and files

