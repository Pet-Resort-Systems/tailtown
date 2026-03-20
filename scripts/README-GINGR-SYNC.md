# Gingr Sync Scripts

## Quick Start

### Check Current Status
```bash
./scripts/sync-gingr.sh status
```

### Sync Reservations Only (Fast)
```bash
./scripts/sync-gingr.sh reservations
```

### Full Sync (All Data)
```bash
./scripts/sync-gingr.sh full
```

### Validate No Overlaps
```bash
./scripts/sync-gingr.sh validate
```

### Fix Any Overlaps
```bash
./scripts/sync-gingr.sh fix-overlaps
```

## Available Scripts

### Helper Script (Recommended)
- **`sync-gingr.sh`** - Convenient wrapper for all sync operations
  - `./scripts/sync-gingr.sh help` - Show all commands

### Individual Scripts

1. **`sync-gingr-reservations.mjs`**
   - Syncs reservations from Gingr
   - Updates existing reservations
   - Adds new reservations with smart suite assignment
   - Prevents overlaps automatically
   - Date range: Last 30 days to next 90 days

2. **`sync-all-gingr-data.mjs`**
   - Syncs customers, pets, AND reservations
   - Runs in correct order with dependencies
   - Includes validation at the end

3. **`fix-overlapping-reservations.sql`**
   - Fixes any overlapping reservations
   - Moves conflicting reservations to available suites
   - Run iteratively until clean

4. **`validate-no-overlaps.sql`**
   - Quick check for overlaps
   - Shows count and details
   - Run after any sync or data changes

## How It Works

### Sync Process

1. **Fetch from Gingr API**
   - Retrieves data for configured date range
   - Uses Gingr API credentials

2. **Map IDs**
   - Matches Gingr IDs to Tailtown IDs via `externalId`
   - Customers, Pets, Services

3. **Update Existing**
   - Updates records that already exist (by `externalId`)
   - Preserves suite assignments

4. **Insert New**
   - Adds new records not in database
   - For reservations: finds available suite with no overlaps
   - Automatically prevents conflicts

5. **Validate**
   - Checks for any overlaps
   - Reports issues

### Overlap Prevention

For each new reservation:
```
1. Get list of all available suites (A, B, C, D rooms)
2. For each suite:
   - Check if any reservation overlaps with this date range
   - If no overlap: assign this suite
   - If overlap: try next suite
3. If no suite available: use first suite (shouldn't happen)
```

**Overlap Logic:**
Two reservations overlap if they're in the same suite AND:
```
reservation1.startDate < reservation2.endDate 
AND 
reservation1.endDate > reservation2.startDate
```

## Configuration

### Date Range
Edit in `sync-gingr-reservations.mjs`:
```javascript
// Default: Last 30 days to next 90 days
startDate.setDate(startDate.getDate() - 30);  // Change -30
endDate.setDate(endDate.getDate() + 90);      // Change +90
```

### Gingr Credentials
Located in each script:
```javascript
const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
  baseUrl: 'https://tailtownpetresort.gingrapp.com/api/v1'
};
```

⚠️ **TODO:** Move to environment variables for production

## Recommended Schedule

### Production
```bash
# Daily full sync at 2 AM
0 2 * * * cd /path/to/tailtown && ./scripts/sync-gingr.sh full >> logs/sync.log 2>&1

# Hourly reservation sync during business hours (9 AM - 6 PM)
0 9-18 * * * cd /path/to/tailtown && ./scripts/sync-gingr.sh reservations >> logs/sync.log 2>&1
```

### Development
- Full sync: Weekly or as needed
- Reservation sync: When testing or after Gingr changes

## Troubleshooting

### Overlaps After Sync
```bash
./scripts/sync-gingr.sh fix-overlaps
```

### Missing Mappings
Reservations skipped due to missing customer/pet/service mappings:
1. Run full sync to ensure all dependencies exist
2. Check that `externalId` fields are populated

### Check Sync Status
```bash
./scripts/sync-gingr.sh status
```

Shows:
- Last sync time
- Reservation counts by status
- Suite distribution
- Overlap status
- Data completeness

## Files Created

### Scripts
- `sync-gingr-reservations.mjs` - Reservation sync with overlap prevention
- `sync-all-gingr-data.mjs` - Full data sync
- `sync-gingr.sh` - Helper script for all operations
- `fix-overlapping-reservations.sql` - Fix overlaps
- `validate-no-overlaps.sql` - Check for overlaps

### Documentation
- `docs/GINGR-SYNC-GUIDE.md` - Comprehensive guide
- `docs/RESERVATION-OVERLAP-PREVENTION.md` - Overlap prevention details
- `scripts/README-GINGR-SYNC.md` - This file

### Tests
- `apps/reservation-service/src/__tests__/reservation-overlap.test.ts` - Overlap tests

## Examples

### Daily Maintenance
```bash
# Morning: Check status
./scripts/sync-gingr.sh status

# Sync latest reservations
./scripts/sync-gingr.sh reservations

# Validate
./scripts/sync-gingr.sh validate
```

### After Major Gingr Changes
```bash
# Full sync
./scripts/sync-gingr.sh full

# Check for issues
./scripts/sync-gingr.sh status

# Fix any overlaps
./scripts/sync-gingr.sh fix-overlaps
```

### Before Going Live
```bash
# Full sync
./scripts/sync-gingr.sh full

# Validate clean
./scripts/sync-gingr.sh validate

# Check status
./scripts/sync-gingr.sh status
```

## Support

For detailed information, see:
- [Gingr Sync Guide](../docs/GINGR-SYNC-GUIDE.md)
- [Overlap Prevention](../docs/RESERVATION-OVERLAP-PREVENTION.md)

## Summary

✅ **What We Built:**
1. Smart sync that prevents overlaps
2. Updates existing + adds new reservations
3. Validates data integrity
4. Easy-to-use helper script
5. Comprehensive documentation
6. Automated tests

✅ **Key Features:**
- Prevents suite assignment overlaps
- Preserves existing assignments when possible
- Handles missing mappings gracefully
- Provides detailed status reporting
- Can be scheduled for automation
