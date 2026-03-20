# Incremental Gingr Sync

## Overview

The incremental sync is a lightweight, optimized version of the Gingr sync that only syncs recent reservations. It's designed to run frequently (hourly) without performance issues.

## Key Differences from Full Sync

| Feature         | Full Sync                    | Incremental Sync              |
| --------------- | ---------------------------- | ----------------------------- |
| Customers       | All 11,826                   | Creates on-the-fly if missing |
| Pets            | All 18,469                   | Creates on-the-fly if missing |
| Reservations    | Last 30 days to next 90 days | Last 7 days to next 30 days   |
| Duration        | 10+ minutes (often hangs)    | 5-15 seconds                  |
| Database Load   | High                         | Minimal                       |
| Safe for Hourly | ❌ No                        | ✅ Yes                        |

## What It Syncs

- **Reservations** - Recent and upcoming reservations
- **Customers** - Auto-created if missing (new in Nov 2025)
- **Pets** - Auto-created if missing (new in Nov 2025)
- **Window**: Last 7 days to next 30 days
- **Upsert logic**: Creates new, updates existing
- **Zero skipped**: New customers/pets are created on-the-fly

## Installation

### 1. Deploy the Script

```bash
# Copy to production server
cd /Users/robweinstein/CascadeProjects/tailtown/services/customer
scp scripts/incremental-gingr-sync.js root@<server>:/opt/tailtown/services/customer/scripts/
scp scripts/setup-hourly-sync-cron.sh root@<server>:/opt/tailtown/services/customer/scripts/
```

### 2. Setup Cron Job

```bash
# On production server
cd /opt/tailtown/services/customer/scripts
chmod +x setup-hourly-sync-cron.sh
./setup-hourly-sync-cron.sh
```

This will:

- Create a cron job to run every hour
- Log output to `/var/log/gingr-sync.log`
- Use the correct Node.js path

## Manual Usage

### Sync Specific Tenant

```bash
cd /opt/tailtown/services/customer
node scripts/incremental-gingr-sync.js b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
```

### Sync All Enabled Tenants

```bash
cd /opt/tailtown/services/customer
node scripts/incremental-gingr-sync.js
```

## Monitoring

### View Cron Job

```bash
crontab -l | grep gingr
```

### View Sync Logs

```bash
# Real-time
tail -f /var/log/gingr-sync.log

# Last 50 lines
tail -50 /var/log/gingr-sync.log

# Search for errors
grep -i error /var/log/gingr-sync.log
```

### Check Last Sync Time

```sql
SELECT "businessName", "lastGingrSyncAt", "gingrSyncEnabled"
FROM tenants
WHERE "gingrSyncEnabled" = true;
```

## Expected Output

```
🔄 Starting Incremental Gingr Sync
   Tenant: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
   Time: 2025-11-19T19:00:00.000Z

📅 Fetching reservations from 2025-11-12 to 2025-12-19...
   Found 487 reservations in Gingr

✅ Reservations: 7 created, 23 updated, 457 skipped, 0 errors

✅ Sync complete in 8.3s
```

## Performance Metrics

- **Typical duration**: 5-15 seconds
- **API calls**: 1-3 (depending on date range)
- **Database queries**: ~500-1000 (mostly lookups)
- **Memory usage**: <50MB
- **CPU usage**: Minimal

## Troubleshooting

### Sync Not Running

```bash
# Check cron status
systemctl status cron  # or crond on some systems

# Check cron logs
grep CRON /var/log/syslog  # or /var/log/cron
```

### High Error Count

As of November 2025, the incremental sync automatically creates missing customers and pets on-the-fly, so "customer or pet not found" errors should be rare.

If you still see many errors:

1. Check the Gingr API is responding correctly
2. Check database connectivity
3. Run a full sync to refresh all data:
   ```bash
   cd /opt/tailtown/services/customer
   node scripts/run-gingr-sync.js
   ```

### Sync Taking Too Long

If incremental sync takes >30 seconds:

1. Check date range (should be 7+30 days)
2. Check database performance
3. Consider reducing sync window

## Configuration

Edit the script to adjust:

```javascript
// Sync window configuration
const SYNC_WINDOW_PAST_DAYS = 7; // How far back to sync
const SYNC_WINDOW_FUTURE_DAYS = 30; // How far ahead to sync
```

## When to Use Full Sync vs Incremental

### Use Incremental Sync (Hourly)

- ✅ Normal operations
- ✅ Keeping reservations up-to-date
- ✅ Minimal disruption

### Use Full Sync (Weekly/Monthly)

- ✅ Initial setup
- ✅ After Gingr data migration
- ✅ When customers/pets are out of sync
- ✅ Quarterly data refresh

## Migration from Full Sync

1. **Keep existing full sync** running every 8 hours (for customers/pets)
2. **Add incremental sync** running every hour (for reservations)
3. **Monitor for 24 hours** to ensure both work correctly
4. **Optional**: Reduce full sync to once per day

Or:

1. **Replace full sync** with incremental sync (hourly)
2. **Schedule full sync** once per week (Sunday 2 AM)

## Rollback

To remove the hourly cron and revert to full sync:

```bash
# Remove incremental sync cron
crontab -l | grep -v "incremental-gingr-sync.js" | crontab -

# Verify removal
crontab -l
```

## Related Documentation

- [Full Sync Guide](./README-GINGR-SYNC.md)
- [Overnight Fix Documentation](../../docs/OVERNIGHT_RESERVATION_FIX_2025-11-19.md)
- [Gingr API Documentation](../../docs/gingr/GINGR-API.md)

---

**Created**: November 19, 2025  
**Updated**: November 28, 2025 - Added auto-create customers/pets feature  
**Author**: Cascade AI Assistant  
**Version**: 1.1.0
