# Staging Environment Setup

> **Status**: ✅ DEPLOYED (December 1, 2025)

This guide covers setting up and using the Tailtown staging environment.

## Overview

| Environment    | URL                            | Ports            | Branch    |
| -------------- | ------------------------------ | ---------------- | --------- |
| **Production** | tailtown.canicloud.com         | 3000, 4003, 4004 | `main`    |
| **Staging**    | staging.tailtown.canicloud.com | 5000, 5003, 5004 | `staging` |

## Current Status

| Component           | Status                | Details                       |
| ------------------- | --------------------- | ----------------------------- |
| Customer Service    | ✅ Running            | Port 5004                     |
| Reservation Service | ✅ Running            | Port 5003                     |
| Frontend            | ✅ Running            | Port 5000                     |
| Database            | ✅ `tailtown_staging` | Anonymized data               |
| SSL                 | ✅ Valid              | Expires March 2026            |
| Data                | ✅ Synced             | 11,902 customers, 18,458 pets |

---

## Quick Start

### Option A: Same Server (Different Ports)

If running staging on the same server as production:

```bash
# 1. Create staging directory
sudo mkdir -p /opt/tailtown-staging
sudo chown tailtown:tailtown /opt/tailtown-staging

# 2. Clone repo
cd /opt/tailtown-staging
git clone git@github.com:moosecreates/tailtown.git .
git checkout staging

# 3. Create staging database
sudo -u postgres createdb tailtown_staging

# 4. Set up environment
cp .env.example .env.staging
# Edit .env.staging with staging values

# 5. Install and build
npm install
npm run build

# 6. Start staging services
pm2 start ecosystem.staging.config.js

# 7. Set up Nginx
sudo cp config/nginx/tailtown-staging.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/tailtown-staging.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Option B: Separate Server

For a dedicated staging server, follow the same production setup but use staging configs.

---

## Configuration Files

| File                                   | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `ecosystem.staging.config.js`          | PM2 process config (ports 5000-5004) |
| `config/nginx/tailtown-staging.conf`   | Nginx reverse proxy                  |
| `.github/workflows/deploy-staging.yml` | Auto-deploy on push to `staging`     |

---

## Environment Variables

Create `.env.staging` with:

```bash
NODE_ENV=staging
PORT=5004  # Customer service

# Database (separate from production!)
DATABASE_URL=postgresql://user:pass@localhost:5432/tailtown_staging

# Redis (use different DB number)
REDIS_URL=redis://localhost:6379/1

# API URLs
REACT_APP_API_URL=https://staging.tailtown.canicloud.com
REACT_APP_ENVIRONMENT=staging

# Same secrets as production (or staging-specific)
JWT_SECRET=your-staging-jwt-secret
ENCRYPTION_KEY=your-staging-encryption-key
```

---

## Database Setup

### Option 1: Fresh Database

```bash
# Create empty staging database
sudo -u postgres createdb tailtown_staging

# Run migrations
cd services/customer
DATABASE_URL=postgresql://...tailtown_staging npx prisma migrate deploy

# Seed with test data
npm run seed:staging
```

### Option 2: Anonymized Production Copy

```bash
# Dump production (on prod server)
pg_dump tailtown > /tmp/tailtown_prod.sql

# Restore to staging
psql tailtown_staging < /tmp/tailtown_prod.sql

# Anonymize sensitive data
psql tailtown_staging << 'EOF'
UPDATE "User" SET
  email = 'user' || id || '@staging.test',
  "passwordHash" = '$2b$10$staging.hash.placeholder';
UPDATE "Customer" SET
  email = 'customer' || id || '@staging.test',
  phone = '555-000-0000';
EOF
```

---

## Deployment Flow

```
Developer → Push to `staging` branch
              ↓
GitHub Actions → Run tests
              ↓
           → Build artifacts
              ↓
           → Deploy to staging server
              ↓
           → Run smoke tests
              ↓
QA/Review → Test on staging.tailtown.canicloud.com
              ↓
Approved  → Merge to `main` → Deploy to production
```

---

## GitHub Secrets Required

Add these to your repository secrets:

| Secret                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `STAGING_HOST`         | Staging server IP/hostname               |
| `STAGING_USER`         | SSH username                             |
| `SSH_PRIVATE_KEY`      | SSH key for deployment                   |
| `STAGING_API_URL`      | `https://staging.tailtown.canicloud.com` |
| `STAGING_DATABASE_URL` | PostgreSQL connection string             |

---

## SSL Certificate

```bash
# Get SSL cert for staging subdomain
sudo certbot certonly --nginx -d staging.tailtown.canicloud.com
```

---

## Useful Commands

```bash
# View staging logs
pm2 logs staging-customer-service
pm2 logs staging-reservation-service

# Restart staging
pm2 restart ecosystem.staging.config.js

# Check staging status
pm2 status | grep staging

# Test staging health
curl https://staging.tailtown.canicloud.com/health
```

---

## Differences from Production

| Aspect          | Production    | Staging           |
| --------------- | ------------- | ----------------- |
| Instances       | 2 per service | 1 per service     |
| Memory limit    | 1GB           | 512MB             |
| Cache TTL       | 1 year        | 1 day             |
| Rate limits     | 100 req/s     | 10 req/s          |
| Search indexing | Allowed       | Blocked (noindex) |
| Redis DB        | 0             | 1                 |

---

**Last Updated**: December 1, 2025
