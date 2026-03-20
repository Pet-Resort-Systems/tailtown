# Nightly Full Gingr Sync

## Overview

The nightly full sync runs every night at **8:00 PM Mountain Time** (3:00 AM UTC) to keep all customer and pet data in sync with Gingr.

## What Gets Synced

### Nightly Full Sync (8:00 PM MT)
- ✅ **Customers** - All customer/owner data including notes
- ✅ **Pets** - All pet/animal data including notes
- ✅ **Reservations** - Last 30 days to next 90 days
- ✅ **Invoices** - Recent invoice data

### Hourly Incremental Sync (Every hour)
- ✅ **Reservations only** - Last 7 days to next 30 days
- ⚡ Fast (15-20 seconds)

## Why Two Syncs?

**Nightly Full Sync:**
- Customer/pet data changes infrequently
- Takes 5-10 minutes to sync all 18,469 pets
- Runs when business is closed (no performance impact)
- Ensures all notes and profile updates are captured

**Hourly Incremental Sync:**
- Reservation data changes frequently throughout the day
- Takes only 15-20 seconds
- Keeps dashboard real-time
- Minimal resource usage

## Installation

### Deploy Scripts to Production

```bash
# From LOCAL machine
cd /Users/robweinstein/CascadeProjects/tailtown/services/customer

scp -i ~/ttkey scripts/full-gingr-sync.js root@129.212.178.244:/opt/tailtown/services/customer/scripts/
scp -i ~/ttkey scripts/setup-nightly-sync-cron.sh root@129.212.178.244:/opt/tailtown/services/customer/scripts/
```

### Setup Cron Job

```bash
# SSH into production
ssh -i ~/ttkey root@129.212.178.244

# Navigate to scripts
cd /opt/tailtown/services/customer/scripts

# Make setup script executable
chmod +x setup-nightly-sync-cron.sh

# Run setup
./setup-nightly-sync-cron.sh
```

## Verify Installation

### Check Cron Jobs

```bash
crontab -l | grep gingr
```

Expected output:
```
0 * * * * cd /opt/tailtown/services/customer && /usr/bin/node /opt/tailtown/services/customer/scripts/incremental-gingr-sync.js >> /var/log/gingr-sync.log 2>&1
0 3 * * * cd /opt/tailtown/services/customer && /usr/bin/node /opt/tailtown/services/customer/scripts/full-gingr-sync.js >> /var/log/gingr-full-sync.log 2>&1
```

### Test Nightly Sync Manually

```bash
# Run the nightly sync now (don't wait for 8 PM)
cd /opt/tailtown/services/customer
node scripts/full-gingr-sync.js b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
```

Expected output:
```
🌙 Starting Nightly Full Gingr Sync
   Tenant: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
   Time: 2025-11-20T03:00:00.000Z
   Mountain Time: 11/19/2025, 8:00:00 PM

📋 Syncing: Tail Town Pet Resort (tailtown)

   Syncing customers...
      Found 11826 customers to sync
      Progress: 100/11826 customers (100 synced)
      ...

✅ Full sync complete!
   Duration: 487.3s
   Customers: 11826
   Pets: 18469
   Reservations: 6559
   Invoices: 1234
```

## Monitoring

### View Nightly Sync Logs

```bash
# Real-time
tail -f /var/log/gingr-full-sync.log

# Last sync
tail -100 /var/log/gingr-full-sync.log

# Search for errors
grep -i error /var/log/gingr-full-sync.log
```

### View Hourly Sync Logs

```bash
tail -f /var/log/gingr-sync.log
```

### Check Last Sync Time

```sql
SELECT 
  "businessName",
  "lastGingrSyncAt",
  "gingrSyncEnabled",
  NOW() - "lastGingrSyncAt" as time_since_last_sync
FROM tenants
WHERE "gingrSyncEnabled" = true;
```

## Sync Schedule

| Time (MT) | Time (UTC) | Sync Type | What Syncs | Duration |
|-----------|------------|-----------|------------|----------|
| 8:00 PM | 3:00 AM | **Full** | Customers, Pets, Reservations, Invoices | 5-10 min |
| Every hour | Every hour | **Incremental** | Reservations only | 15-20 sec |

## Troubleshooting

### Nightly Sync Not Running

```bash
# Check cron service
systemctl status cron  # or crond

# Check cron logs
grep CRON /var/log/syslog | grep gingr

# Verify cron entry
crontab -l | grep full-gingr-sync
```

### Sync Taking Too Long

If nightly sync takes more than 15 minutes:
1. Check database performance
2. Check network connectivity to Gingr API
3. Review error logs for failed requests

### High Error Count

```bash
# Check what's failing
grep -A 5 "Error" /var/log/gingr-full-sync.log | tail -50
```

Common issues:
- Missing customers (pets can't sync without owner)
- Invalid data format from Gingr
- Database connection issues

## Manual Sync

### Sync Specific Tenant

```bash
node scripts/full-gingr-sync.js b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
```

### Sync All Enabled Tenants

```bash
node scripts/full-gingr-sync.js
```

## Disable Nightly Sync

To temporarily disable:

```bash
# Comment out the cron entry
crontab -e

# Add # at the beginning of the line:
# 0 3 * * * cd /opt/tailtown/services/customer && /usr/bin/node ...
```

To permanently remove:

```bash
crontab -l | grep -v "full-gingr-sync.js" | crontab -
```

## Performance Impact

**During Nightly Sync (8:00 PM - 8:10 PM MT):**
- CPU: 20-40% usage
- Memory: +200-300 MB
- Database: Moderate load
- API: ~500-1000 requests to Gingr

**Impact on Users:**
- ✅ None - business is closed
- ✅ Dashboard remains responsive
- ✅ No downtime

## What Gets Updated

### Customer Updates
- Contact information
- Emergency contacts
- **Notes** (general customer notes)

### Pet Updates
- Basic info (name, breed, color, weight)
- Medical info (medications, allergies)
- **Notes** (general pet notes) ← NEW
- Food notes
- Behavior notes
- Special needs

### Reservation Updates
- Status changes
- Check-in/check-out times
- Cancellations
- Notes

## Related Documentation

- [Incremental Sync](./README-INCREMENTAL-SYNC.md)
- [Pet Notes Deployment](../../docs/PET_NOTES_SYNC_DEPLOYMENT.md)
- [Gingr Sync Guide](../../docs/gingr/GINGR-SYNC-GUIDE.md)

---

**Created:** November 19, 2025  
**Schedule:** Nightly at 8:00 PM Mountain Time  
**Duration:** 5-10 minutes  
**Impact:** None (runs after hours)
