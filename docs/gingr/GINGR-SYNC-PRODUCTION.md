# Gingr Sync - Production Deployment Guide

## Overview

This guide explains how to set up and run Gingr sync in production on Digital Ocean.

## Key Differences: Local vs Production

### Local Development
- Uses `docker exec` to run commands in containers
- Database: `localhost:5433`
- Scripts: `sync-gingr.sh`, `sync-gingr-reservations.mjs`

### Production (Digital Ocean)
- Connects directly to PostgreSQL (managed database or container)
- Database: Connection string from `DATABASE_URL` env variable
- Scripts: `sync-gingr-prod.sh`, `sync-gingr-reservations-prod.mjs`

## Setup on Digital Ocean

### 1. Install Dependencies

SSH into your droplet and install required packages:

```bash
ssh root@your-droplet-ip

# Install Node.js if not already installed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

# Install project dependencies
cd /opt/tailtown
pnpm install
```

### 2. Configure Environment Variables

Create or update `.env.production`:

```bash
nano /opt/tailtown/.env.production
```

Add Gingr configuration:

```env
# Existing config...
DATABASE_URL=postgresql://user:password@host:5432/customer

# Gingr API Configuration
GINGR_SUBDOMAIN=tailtownpetresort
GINGR_API_KEY=your_gingr_api_key_here
GINGR_BASE_URL=https://tailtownpetresort.gingrapp.com/api/v1

# Tenant ID
TENANT_ID=prod
```

**Security Note:** Never commit `.env.production` to git!

### 3. Test the Connection

```bash
cd /opt/tailtown

# Test database connection
psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM reservations;"

# Test sync script
./scripts/sync-gingr-prod.sh status
```

## Usage in Production

### Manual Sync

```bash
cd /opt/tailtown

# Sync reservations
./scripts/sync-gingr-prod.sh sync

# Check status
./scripts/sync-gingr-prod.sh status

# Validate no overlaps
./scripts/sync-gingr-prod.sh validate

# Fix overlaps if needed
./scripts/sync-gingr-prod.sh fix-overlaps
```

### Automated Sync with Cron

Create a cron job for automated syncing:

```bash
# Edit crontab
crontab -e
```

Add these lines:

```bash
# Daily full sync at 2 AM
0 2 * * * cd /opt/tailtown && ./scripts/sync-gingr-prod.sh sync >> /var/log/tailtown/gingr-sync.log 2>&1

# Hourly sync during business hours (9 AM - 6 PM)
0 9-18 * * * cd /opt/tailtown && ./scripts/sync-gingr-prod.sh sync >> /var/log/tailtown/gingr-sync.log 2>&1

# Daily validation at 3 AM
0 3 * * * cd /opt/tailtown && ./scripts/sync-gingr-prod.sh validate >> /var/log/tailtown/gingr-sync.log 2>&1
```

Create log directory:

```bash
sudo mkdir -p /var/log/tailtown
sudo chown tailtown:tailtown /var/log/tailtown
```

### Using Systemd Timer (Alternative to Cron)

Create a systemd service:

```bash
sudo nano /etc/systemd/system/gingr-sync.service
```

```ini
[Unit]
Description=Gingr Reservation Sync
After=network.target

[Service]
Type=oneshot
User=tailtown
WorkingDirectory=/opt/tailtown
EnvironmentFile=/opt/tailtown/.env.production
ExecStart=/opt/tailtown/scripts/sync-gingr-prod.sh sync
StandardOutput=append:/var/log/tailtown/gingr-sync.log
StandardError=append:/var/log/tailtown/gingr-sync.log

[Install]
WantedBy=multi-user.target
```

Create a timer:

```bash
sudo nano /etc/systemd/system/gingr-sync.timer
```

```ini
[Unit]
Description=Run Gingr Sync every 2 hours
Requires=gingr-sync.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=2h
Unit=gingr-sync.service

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gingr-sync.timer
sudo systemctl start gingr-sync.timer

# Check status
sudo systemctl status gingr-sync.timer
sudo systemctl list-timers
```

## Docker Deployment

If running in Docker containers on Digital Ocean:

### Option 1: Run from Host

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Run sync from host
cd /opt/tailtown
./scripts/sync-gingr-prod.sh sync
```

### Option 2: Run Inside Container

Add to your `docker-compose.prod.yml`:

```yaml
services:
  sync-scheduler:
    build:
      context: .
      dockerfile: Dockerfile.sync
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GINGR_API_KEY=${GINGR_API_KEY}
      - GINGR_SUBDOMAIN=${GINGR_SUBDOMAIN}
      - TENANT_ID=${TENANT_ID}
    volumes:
      - ./scripts:/app/scripts
    command: node /app/scripts/sync-scheduler.js
    restart: unless-stopped
    depends_on:
      - postgres
```

Create `Dockerfile.sync`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./
RUN pnpm install --prod --frozen-lockfile

# Copy scripts
COPY scripts/ ./scripts/

CMD ["node", "scripts/sync-scheduler.js"]
```

Create `scripts/sync-scheduler.js`:

```javascript
import schedule from 'node-schedule';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Gingr Sync Scheduler started');

// Every 2 hours
schedule.scheduleJob('0 */2 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running sync...`);
  try {
    const { stdout, stderr } = await execAsync('node /app/scripts/sync-gingr-reservations-prod.mjs');
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Sync failed:', error);
  }
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('Shutting down scheduler...');
  process.exit(0);
});
```

## Monitoring

### Check Sync Logs

```bash
# View recent logs
tail -f /var/log/tailtown/gingr-sync.log

# View last sync
tail -n 100 /var/log/tailtown/gingr-sync.log

# Search for errors
grep -i error /var/log/tailtown/gingr-sync.log
```

### Check Sync Status

```bash
./scripts/sync-gingr-prod.sh status
```

### Set Up Alerts

Create a monitoring script:

```bash
nano /opt/tailtown/scripts/check-sync-health.sh
```

```bash
#!/bin/bash

# Check for overlaps
OVERLAPS=$(psql "${DATABASE_URL}" -t -c "
  SELECT COUNT(*) FROM reservations r1
  JOIN reservations r2 ON r1.\"resourceId\" = r2.\"resourceId\" AND r1.id < r2.id
  WHERE r1.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
    AND r2.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
    AND r1.\"startDate\" < r2.\"endDate\"
    AND r1.\"endDate\" > r2.\"startDate\"
" | tr -d ' ')

if [ "$OVERLAPS" -gt 0 ]; then
  echo "⚠️  WARNING: $OVERLAPS overlapping reservations detected!"
  # Send alert (email, Slack, etc.)
  # curl -X POST https://hooks.slack.com/... -d "{'text':'Overlaps detected: $OVERLAPS'}"
  exit 1
fi

echo "✅ No overlaps detected"
exit 0
```

Add to cron:

```bash
# Check for overlaps every hour
0 * * * * /opt/tailtown/scripts/check-sync-health.sh >> /var/log/tailtown/health-check.log 2>&1
```

## Troubleshooting

### Connection Issues

```bash
# Test database connection
psql "${DATABASE_URL}" -c "SELECT version();"

# Check environment variables
env | grep -E 'DATABASE_URL|GINGR'

# Test Gingr API
curl -X POST https://tailtownpetresort.gingrapp.com/api/v1/reservations \
  -d "key=YOUR_API_KEY&start_date=2025-01-01&end_date=2025-01-31"
```

### Permission Issues

```bash
# Ensure correct ownership
sudo chown -R tailtown:tailtown /opt/tailtown

# Make scripts executable
chmod +x /opt/tailtown/scripts/*.sh
```

### Sync Failures

```bash
# Check logs
tail -n 100 /var/log/tailtown/gingr-sync.log

# Run manually with verbose output
cd /opt/tailtown
NODE_ENV=production node scripts/sync-gingr-reservations-prod.mjs
```

### Overlaps After Sync

```bash
# Fix overlaps
./scripts/sync-gingr-prod.sh fix-overlaps

# Validate
./scripts/sync-gingr-prod.sh validate
```

## Security Best Practices

1. **Secure Environment Variables**
   ```bash
   # Restrict access to .env file
   chmod 600 /opt/tailtown/.env.production
   ```

2. **Use Secrets Management**
   - Consider using Digital Ocean Secrets
   - Or HashiCorp Vault for sensitive data

3. **Rotate API Keys**
   - Regularly rotate Gingr API keys
   - Update `.env.production` when changed

4. **Monitor Access**
   ```bash
   # Check who can access sync scripts
   ls -la /opt/tailtown/scripts/
   ```

5. **Audit Logs**
   ```bash
   # Keep logs for at least 30 days
   # Set up log rotation
   sudo nano /etc/logrotate.d/tailtown
   ```

   ```
   /var/log/tailtown/*.log {
       daily
       rotate 30
       compress
       delaycompress
       notifempty
       create 0640 tailtown tailtown
   }
   ```

## Performance Optimization

### For Large Datasets

1. **Adjust Date Range**
   Edit `sync-gingr-reservations-prod.mjs`:
   ```javascript
   // Reduce range for faster syncs
   startDate.setDate(startDate.getDate() - 7);  // Last 7 days instead of 30
   endDate.setDate(endDate.getDate() + 30);     // Next 30 days instead of 90
   ```

2. **Batch Processing**
   - Process in smaller chunks
   - Add delays between API calls

3. **Database Indexing**
   ```sql
   -- Ensure indexes exist
   CREATE INDEX IF NOT EXISTS idx_reservations_external_id ON reservations("externalId");
   CREATE INDEX IF NOT EXISTS idx_reservations_resource_dates ON reservations("resourceId", "startDate", "endDate");
   ```

## Backup Before Sync

Always backup before major syncs:

```bash
# Backup database
pg_dump "${DATABASE_URL}" > /opt/tailtown/backups/pre-sync-$(date +%Y%m%d-%H%M%S).sql

# Or use Digital Ocean snapshots
doctl compute droplet-action snapshot <droplet-id> --snapshot-name "pre-gingr-sync-$(date +%Y%m%d)"
```

## Related Documentation

- [Gingr Sync Guide](./GINGR-SYNC-GUIDE.md) - Comprehensive sync guide
- [Docker Deploy Guide](../DOCKER-DEPLOY.md) - Digital Ocean deployment
- [Overlap Prevention](./RESERVATION-OVERLAP-PREVENTION.md) - Overlap details

## Support Checklist

Before reaching out for help:

- [ ] Checked logs: `/var/log/tailtown/gingr-sync.log`
- [ ] Verified database connection
- [ ] Tested Gingr API access
- [ ] Checked environment variables
- [ ] Ran status command
- [ ] Validated no overlaps
- [ ] Reviewed recent changes

## Quick Reference

```bash
# Sync
./scripts/sync-gingr-prod.sh sync

# Status
./scripts/sync-gingr-prod.sh status

# Validate
./scripts/sync-gingr-prod.sh validate

# Fix overlaps
./scripts/sync-gingr-prod.sh fix-overlaps

# View logs
tail -f /var/log/tailtown/gingr-sync.log

# Check cron jobs
crontab -l

# Test database
psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM reservations;"
```
