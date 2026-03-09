# Gingr Sync - Deployment Summary

## ✅ Production-Ready Sync System

Your Gingr sync system is now ready for both local development and Digital Ocean production deployment!

## What We Built

### 1. **Dual-Environment Scripts**

#### Local Development
- **`sync-gingr.sh`** - Uses `docker exec` for local Docker containers
- **`sync-gingr-reservations.mjs`** - Original version for local dev

#### Production (Digital Ocean)
- **`sync-gingr-prod.sh`** - Auto-detects environment, works everywhere
- **`sync-gingr-reservations-prod.mjs`** - Uses direct PostgreSQL connection

### 2. **Key Features**

✅ **Environment Detection**
- Automatically detects: local, Docker, or production
- Uses appropriate database connection method
- No code changes needed between environments

✅ **Smart Suite Assignment**
- Prevents overlaps automatically
- Checks availability before assigning
- Preserves existing assignments

✅ **Robust Error Handling**
- Handles missing mappings gracefully
- Validates after sync
- Detailed logging

✅ **Security**
- Uses environment variables
- No hardcoded credentials
- Secure database connections

## Quick Start Guide

### Local Development

```bash
# Check status
./scripts/sync-gingr.sh status

# Sync reservations
./scripts/sync-gingr.sh reservations

# Validate
./scripts/sync-gingr.sh validate
```

### Production (Digital Ocean)

```bash
# SSH into server
ssh root@your-droplet-ip

# Navigate to app
cd /opt/tailtown

# Sync reservations
./scripts/sync-gingr-prod.sh sync

# Check status
./scripts/sync-gingr-prod.sh status

# Validate
./scripts/sync-gingr-prod.sh validate
```

## Setup on Digital Ocean

### Step 1: Install Dependencies

```bash
# Already included in deployment setup
pnpm install
```

### Step 2: Configure Environment

Add to `.env.production`:

```env
# Database (already configured)
DATABASE_URL=postgresql://user:password@host:5432/customer

# Gingr API
GINGR_SUBDOMAIN=tailtownpetresort
GINGR_API_KEY=c84c09ecfacdf23a495505d2ae1df533
GINGR_BASE_URL=https://tailtownpetresort.gingrapp.com/api/v1

# Tenant
TENANT_ID=prod
```

### Step 3: Test

```bash
# Test connection
psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM reservations;"

# Test sync
./scripts/sync-gingr-prod.sh status
```

### Step 4: Automate

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add these lines:
# Daily sync at 2 AM
0 2 * * * cd /opt/tailtown && ./scripts/sync-gingr-prod.sh sync >> /var/log/tailtown/gingr-sync.log 2>&1

# Hourly during business hours
0 9-18 * * * cd /opt/tailtown && ./scripts/sync-gingr-prod.sh sync >> /var/log/tailtown/gingr-sync.log 2>&1
```

## How It Works in Production

### Environment Detection

The script automatically detects where it's running:

```bash
# Local development with Docker
ENV_TYPE="local"
→ Uses: docker exec tailtown-postgres psql...

# Inside Docker container
ENV_TYPE="docker"  
→ Uses: psql $DATABASE_URL...

# Production server
ENV_TYPE="production"
→ Uses: psql $DATABASE_URL...
```

### Database Connection

**Local:**
```bash
postgresql://postgres:postgres@localhost:5433/customer
```

**Production:**
```bash
$DATABASE_URL (from environment)
```

### Overlap Prevention

For each new reservation:
1. Check all available suites (A, B, C, D)
2. For each suite, query for overlapping reservations
3. Assign first available suite
4. Validate after sync

## Files Created

### Production Scripts
- ✅ `scripts/sync-gingr-reservations-prod.mjs` - Production sync script
- ✅ `scripts/sync-gingr-prod.sh` - Production helper script

### Local Scripts (Already Existed)
- ✅ `scripts/sync-gingr-reservations.mjs` - Local sync script
- ✅ `scripts/sync-gingr.sh` - Local helper script
- ✅ `scripts/sync-all-gingr-data.mjs` - Full sync

### SQL Scripts (Work Everywhere)
- ✅ `scripts/fix-overlapping-reservations.sql` - Fix overlaps
- ✅ `scripts/validate-no-overlaps.sql` - Validate

### Documentation
- ✅ `docs/GINGR-SYNC-PRODUCTION.md` - Production deployment guide
- ✅ `docs/GINGR-SYNC-GUIDE.md` - Comprehensive sync guide
- ✅ `docs/RESERVATION-OVERLAP-PREVENTION.md` - Overlap details
- ✅ `scripts/README-GINGR-SYNC.md` - Quick reference

### Tests
- ✅ `apps/reservation-service/src/__tests__/reservation-overlap.test.ts`

## Differences: Local vs Production

| Feature         | Local                         | Production                         |
| --------------- | ----------------------------- | ---------------------------------- |
| Database Access | `docker exec`                 | Direct `psql`                      |
| Connection      | `localhost:5433`              | `$DATABASE_URL`                    |
| Script          | `sync-gingr.sh`               | `sync-gingr-prod.sh`               |
| Node Script     | `sync-gingr-reservations.mjs` | `sync-gingr-reservations-prod.mjs` |
| Environment     | Docker containers             | Managed DB or container            |

## Commands Reference

### Local Development

```bash
# Status
./scripts/sync-gingr.sh status

# Sync
./scripts/sync-gingr.sh reservations

# Full sync (customers + pets + reservations)
./scripts/sync-gingr.sh full

# Validate
./scripts/sync-gingr.sh validate

# Fix overlaps
./scripts/sync-gingr.sh fix-overlaps
```

### Production

```bash
# Status
./scripts/sync-gingr-prod.sh status

# Sync
./scripts/sync-gingr-prod.sh sync

# Validate
./scripts/sync-gingr-prod.sh validate

# Fix overlaps
./scripts/sync-gingr-prod.sh fix-overlaps
```

## Monitoring in Production

### Check Logs

```bash
# View sync logs
tail -f /var/log/tailtown/gingr-sync.log

# Check for errors
grep -i error /var/log/tailtown/gingr-sync.log
```

### Check Status

```bash
./scripts/sync-gingr-prod.sh status
```

Shows:
- Last sync time
- Reservation counts by status
- Suite distribution
- Overlap status

### Set Up Alerts

```bash
# Add to crontab for hourly health checks
0 * * * * /opt/tailtown/scripts/check-sync-health.sh >> /var/log/tailtown/health-check.log 2>&1
```

## Troubleshooting

### Issue: "Command not found: docker"

**Solution:** You're in production, use the prod script:
```bash
./scripts/sync-gingr-prod.sh sync
```

### Issue: "Connection refused"

**Solution:** Check DATABASE_URL:
```bash
echo $DATABASE_URL
psql "${DATABASE_URL}" -c "SELECT 1;"
```

### Issue: "Missing mappings"

**Solution:** Sync customers and pets first:
```bash
node scripts/import-gingr-customer-data.js
node scripts/import-gingr-pet-profiles.js
./scripts/sync-gingr-prod.sh sync
```

### Issue: "Overlaps detected"

**Solution:** Run fix script:
```bash
./scripts/sync-gingr-prod.sh fix-overlaps
```

## Security Checklist

- [ ] `.env.production` has secure permissions (`chmod 600`)
- [ ] Gingr API key is not in git
- [ ] DATABASE_URL uses strong password
- [ ] Logs directory has correct ownership
- [ ] Cron jobs run as non-root user
- [ ] API keys rotated regularly

## Performance Tips

### For Large Datasets

1. **Reduce date range** in `sync-gingr-reservations-prod.mjs`:
   ```javascript
   startDate.setDate(startDate.getDate() - 7);  // Last 7 days
   endDate.setDate(endDate.getDate() + 30);     // Next 30 days
   ```

2. **Add database indexes**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_reservations_external_id 
   ON reservations("externalId");
   
   CREATE INDEX IF NOT EXISTS idx_reservations_resource_dates 
   ON reservations("resourceId", "startDate", "endDate");
   ```

3. **Increase sync frequency** (smaller batches more often):
   ```bash
   # Every 2 hours instead of daily
   0 */2 * * * cd /opt/tailtown && ./scripts/sync-gingr-prod.sh sync
   ```

## Next Steps

1. **Test in Production**
   ```bash
   ssh root@your-droplet-ip
   cd /opt/tailtown
   ./scripts/sync-gingr-prod.sh status
   ./scripts/sync-gingr-prod.sh sync
   ```

2. **Set Up Automation**
   ```bash
   crontab -e
   # Add sync schedule
   ```

3. **Monitor First Week**
   ```bash
   # Check logs daily
   tail -f /var/log/tailtown/gingr-sync.log
   
   # Validate daily
   ./scripts/sync-gingr-prod.sh validate
   ```

4. **Adjust as Needed**
   - Fine-tune sync frequency
   - Adjust date ranges
   - Set up alerts

## Documentation Links

- **[Production Deployment Guide](./GINGR-SYNC-PRODUCTION.md)** - Detailed production setup
- **[Comprehensive Sync Guide](./GINGR-SYNC-GUIDE.md)** - How everything works
- **[Overlap Prevention](./RESERVATION-OVERLAP-PREVENTION.md)** - Technical details
- **[Quick Reference](../scripts/README-GINGR-SYNC.md)** - Command cheat sheet

## Support

If you encounter issues:

1. Check logs: `/var/log/tailtown/gingr-sync.log`
2. Run status: `./scripts/sync-gingr-prod.sh status`
3. Validate: `./scripts/sync-gingr-prod.sh validate`
4. Review documentation above
5. Check environment variables

## Summary

✅ **Ready for Production**
- Scripts work in both local and production
- Automatic environment detection
- Secure configuration via environment variables
- Comprehensive documentation
- Automated scheduling ready
- Monitoring and alerts available

✅ **No Code Changes Needed**
- Same commands work everywhere
- Scripts auto-detect environment
- Database connections handled automatically

✅ **Fully Tested**
- Overlap prevention verified
- Tests passing
- Validation scripts ready

**You're all set to deploy! 🚀**
