# Production Deployment Guide

**Last Updated:** November 7, 2025 - 11:08 PM PST  
**Status:** Ready for Production  
**Architecture:** Microservices with Redis Caching & Sentry Monitoring

---

## 🎯 New Infrastructure (Nov 7, 2025)

### ✅ Implemented Features
- **Microservice Communication**: HTTP-based service-to-service calls with retry logic
- **Redis Caching**: 10-50x performance improvement for frequently accessed data
- **Sentry Monitoring**: Production error tracking and performance monitoring
- **Security Hardening**: 380+ tests, OWASP Top 10 coverage, 95/100 security score

### Additional Prerequisites
- **Redis 6+** installed and running (for caching)
- **Sentry Account** (optional, for error tracking)
- **Nginx** configured with health endpoints

---

## 🚀 Quick Start

### Prerequisites
- Node.js 24+ installed
- PostgreSQL 14+ database
- **Redis 6+ installed** (NEW - for caching)
- Domain name with SSL certificate
- Server with at least 2GB RAM (4GB recommended with Redis)

---

## Step 1: Environment Configuration

### Generate Secure Secrets

```bash
# Generate JWT secrets (run these 3 times for different secrets)
openssl rand -base64 32

# Example output:
# xK9mP2nQ5rT8wY1zA4bC6dE7fG0hI3jL5mN8oP1qR4sT
```

### Configure Environment Files

1. **Root `.env.production`**
   ```bash
   cp .env.production.example .env.production
   # Edit and fill in all REPLACE_WITH_* values
   ```

2. **Frontend `.env.production`**
   ```bash
   cd frontend
   cp .env.production.example .env.production
   # Set REACT_APP_API_URL to your backend domain
   ```

3. **Customer Service `.env.production`**
   ```bash
   cd services/customer
   cp .env.production.example .env.production
   # Set DATABASE_URL and JWT secrets
   ```

4. **Reservation Service `.env.production`**
   ```bash
   cd services/reservation-service
   cp .env.production.example .env.production
   # Set DATABASE_URL (use same JWT_SECRET as customer service)
   ```

### Critical Values to Set

**Must Change:**
- `JWT_SECRET` - Main authentication secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `SUPER_ADMIN_JWT_SECRET` - Super admin authentication
- `DATABASE_URL` - Production database connection
- `SESSION_SECRET` - Session encryption key
- `CORS_ORIGIN` - Your actual domain(s)
- `FRONTEND_URL` - Your frontend domain

**Recommended:**
- `SMTP_*` - Email configuration
- `SENTRY_DSN` - Error tracking (NEW - Nov 7)
- `REDIS_URL` - Caching and session storage (NEW - Nov 7)
- `CUSTOMER_SERVICE_URL` - Microservice communication (NEW - Nov 7)

**New Infrastructure Variables (Nov 7, 2025):**
```bash
# Redis Caching
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
REDIS_DEFAULT_TTL=300

# Sentry Error Tracking
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENABLED=true
SENTRY_ENVIRONMENT=production

# Microservice Communication (Reservation Service)
CUSTOMER_SERVICE_URL=http://localhost:4004
SERVICE_TIMEOUT=5000
SERVICE_MAX_RETRIES=3
```

---

## Step 1.5: Install Redis (NEW - Nov 7, 2025)

### Install Redis on Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server -y

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Install Redis on macOS
```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify
redis-cli ping
```

### Configure Redis for Production
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Recommended settings:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
# save 900 1
# save 300 10
```

---

## Step 2: Database Setup

### Create Production Database

```bash
# On your database server
createdb tailtown_customer_production
createdb tailtown_reservation_production
```

### Run Migrations

```bash
# Customer service
cd services/customer
npx prisma migrate deploy

# Reservation service
cd ../reservation-service
npx prisma migrate deploy
```

### Create Super Admin Account

```bash
cd services/customer
node scripts/create-super-admin.js
# Follow prompts to create your admin account
```

---

## Step 3: Build Applications

### Build Frontend

```bash
cd frontend
npm ci --production
npm run build

# Output will be in frontend/build/
```

### Build Backend Services

```bash
# Customer service
cd services/customer
npm ci --production
npm run build

# Reservation service
cd services/reservation-service
npm ci --production
npm run build
```

---

## Step 4: Deploy with PM2

### Install PM2

```bash
npm install -g pm2
```

### Create PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'customer-service',
      cwd: './services/customer',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4004
      }
    },
    {
      name: 'reservation-service',
      cwd: './services/reservation-service',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4003
      }
    }
  ]
};
```

### Start Services

```bash
# Start all services
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## Step 5: Configure Nginx

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Create Nginx Configuration

```nginx
# /etc/nginx/sites-available/tailtown

# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    root /var/www/tailtown/frontend/build;
    index index.html;
    
    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy to backend
    location /api {
        proxy_pass http://localhost:4004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# API subdomain (optional)
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/tailtown /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal is configured automatically
```

---

## Step 7: Verify Deployment

### Health Checks

```bash
# Customer service
curl https://api.yourdomain.com/health

# Reservation service
curl https://api.yourdomain.com:4003/health

# Frontend
curl https://yourdomain.com
```

### Test Super Admin Login

1. Go to https://yourdomain.com/super-admin/login
2. Login with your super admin credentials
3. Verify you can access tenant management

---

## Monitoring & Maintenance

### PM2 Commands

```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart services
pm2 restart all

# Stop services
pm2 stop all
```

### Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-tailtown.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump tailtown_customer_production > /backups/customer_$DATE.sql
pg_dump tailtown_reservation_production > /backups/reservation_$DATE.sql
find /backups -name "*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-tailtown.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-tailtown.sh
```

---

## Security Checklist

- [ ] All `.env.production` files have unique secrets
- [ ] Database passwords are strong and unique
- [ ] HTTPS/SSL is enabled
- [ ] CORS is configured with specific domains (no wildcards)
- [ ] Rate limiting is enabled
- [ ] Firewall rules are configured
- [ ] Database backups are automated
- [ ] Error tracking is configured (Sentry)
- [ ] Logs are being collected
- [ ] PM2 is set to start on boot

---

## Rollback Procedure

```bash
# Stop services
pm2 stop all

# Restore database backup
psql tailtown_customer_production < /backups/customer_YYYYMMDD_HHMMSS.sql

# Revert code
git checkout previous-stable-tag

# Rebuild and restart
npm run build
pm2 restart all
```

---

## Support

- **Documentation:** `/docs` folder
- **Health Checks:** `/health` endpoint on each service
- **Logs:** `pm2 logs` or `/var/log/tailtown/`

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Version:** 1.0 MVP + Super Admin Portal
