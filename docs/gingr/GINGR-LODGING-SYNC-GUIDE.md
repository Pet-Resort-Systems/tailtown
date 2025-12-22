# Gingr Lodging & Resource Sync Guide

**Last Updated:** December 21, 2025  
**Status:** Production Ready  
**Version:** 2.1 - Added Grooming Service Detection  
**Method:** Automatic via Gingr API + CSV Import (for historical corrections)

---

## 🎯 Problem Statement

Tailtown reservations need to match Gingr's kennel/lodging assignments, but:

- Gingr's `/api/v1/reservations` endpoint **does not include lodging fields**
- Gingr's `/api/v1/reservations_by_animal` endpoint **does not include lodging fields**
- Gingr's `/api/v1/back_of_house` endpoint only shows **checked-in boarding guests** (excludes Day Camp)

---

## ✅ Current Solution: Automatic API Sync (Dec 2025)

**UPDATE (Dec 21, 2025):** Gingr API now provides lodging data through undocumented fields. The automatic Gingr sync now correctly extracts and maps lodging assignments for both boarding and daycare reservations.

### How It Works

The Gingr sync service (`gingr-sync.service.ts`) automatically:

1. **Extracts lodging data** from Gingr reservations using `extractGingrLodging()`:

   - Checks `reservation.lodging`, `reservation.lodging_label`, `reservation.room`, etc.
   - Handles various Gingr field formats

2. **Normalizes lodging names** via `normalizeLodgingName()`:

   - `"D. Daycamp D 27"` → `"D27"`
   - `"A. Indoor - A 02"` → `"A02"`
   - `"B  11"` → `"B11"`

3. **Detects Service Category**

The sync automatically determines service categories:

- **DAYCARE**: Detected when lodging contains "DAYCAMP" or "DAY CAMP"
- **GROOMING**: Detected when `reservation_type.type` contains "Grooming" or "grooming"
- **BOARDING**: Default for all other reservations with lodging assignments

### Visual Distinction in Dashboard

Reservations display with color-coded backgrounds:

- 🟦 **Blue** - Boarding (default)
- 🟧 **Orange** - Daycare
- 🟪 **Purple** - Grooming (with ✂️ scissor icon)

**Special Icons:**

- 🐾 **Cat Icon** - Displayed for cat pets or cat condo kennels (K\* rooms)
- ✂️ **Scissor Icon** - Displayed for grooming appointments

Grooming appointments do not require room/kennel assignments.

4. **Maps to Tailtown resources**:
   - Finds or creates matching resource (e.g., D27, A02)
   - Updates `reservation.resourceId` automatically

### Timezone Fix (Dec 2025)

The sync now uses **local dates** instead of UTC when querying Gingr, preventing date-shifting issues that caused missing reservations.

---

## 📋 Legacy Solution: CSV Export + Import

For historical data or manual corrections, you can still use CSV import.

### Step 1: Export from Gingr

1. **Log into Gingr** → Navigate to **Calendar**
2. **Select the date range** you want to sync (e.g., December 16, 2025)
3. Click **"Download"** button (top right of Calendar Details page)
4. Save the CSV file (e.g., `gingr-calendar-2025-12-16.csv`)

**Expected CSV format:**

```csv
Animal,Owner,Start Date,End Date,Type,Lodging,Services,Confirmed,Cancelled,Completed
Cooper,Linda Newill,Tuesday 12/16/2025 6:30 am,Tuesday 12/16/2025 7:00 pm,Day Camp | Full Day,D. Daycamp D 18,,,✓,,
Dumbo,Barragan,Tuesday 12/16/2025 12:00 pm,Friday 12/19/2025 12:00 pm,Boarding | One Free Night,A. Indoor - A 02,,,✓,,
```

### Step 2: Import into Tailtown

```bash
cd /Users/robweinstein/CascadeProjects/tailtown/services/customer

# Run the import script
node scripts/import-gingr-lodging-csv.js /path/to/gingr-calendar-2025-12-16.csv
```

**What the script does:**

1. Parses the CSV file
2. For each row:
   - Normalizes lodging name (`"D. Daycamp D 18"` → `"D18"`)
   - Finds matching Tailtown reservation by pet name, owner, and date
   - Finds or creates the resource (kennel) in Tailtown
   - Updates `reservation.resourceId` to match Gingr

---

## 🔧 Script Details

### Location

`/services/customer/scripts/import-gingr-lodging-csv.js`

### Usage

```bash
node import-gingr-lodging-csv.js <csv-file> [tenant-id]

# Examples:
node import-gingr-lodging-csv.js gingr-calendar-2025-12-16.csv
node import-gingr-lodging-csv.js gingr-calendar-2025-12-16.csv b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
```

### Lodging Name Normalization

The script handles various Gingr lodging formats:

| Gingr Format       | Normalized                |
| ------------------ | ------------------------- |
| `D. Daycamp D 18`  | `D18`                     |
| `A. Indoor - A 02` | `A02`                     |
| `B  11`            | `B11`                     |
| `Suite A03`        | `A03`                     |
| `A 2`              | `A02` (adds leading zero) |

### Resource Type Detection

Based on normalized name:

- Ends with `K` → `KING_KENNEL` (capacity: 3)
- Ends with `Q` → `QUEEN_KENNEL` (capacity: 2)
- Ends with `R` → `JUNIOR_KENNEL` (capacity: 1)
- Starts with `K` or contains `CAT` → `CAT_CONDO` (capacity: 2)
- Default → `STANDARD_SUITE` (capacity: 1)

### Reservation Matching

Finds reservations by:

1. **Pet name** (case-insensitive partial match)
2. **Owner name** (last name or first name, case-insensitive)
3. **Start date** (±1 day tolerance for timezone/format differences)

---

## 📊 Example Output

```
🏨 Gingr Lodging Import from CSV
═══════════════════════════════════════

CSV File: gingr-calendar-2025-12-16.csv
Tenant: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05

Headers: Animal, Owner, Start Date, End Date, Type, Lodging, Services, Confirmed, Cancelled, Completed

Column mapping:
  Animal: Animal (col 0)
  Owner: Owner (col 1)
  Lodging: Lodging (col 5)
  Start Date: Start Date (col 2)

✓ Cooper → D18 (D18)
✓ Dumbo → A02 (A02)
✓ Waylon → C10 (C10)
✓ Coco → B24 (B24)
  Created resource: D18 (STANDARD_SUITE)
✓ Blossom → D19 (D19)

📊 Import Summary
═══════════════════════════════════════
Total rows: 57
Updated: 55
Not found: 2
No lodging: 0
Errors: 2

Errors:
  - Max (Smith) on 12/16/2025: not found
  - Luna (Johnson) on 12/16/2025: not found
```

---

## 🚀 Production Deployment

### Prerequisites

1. Export CSV from Gingr for the date range you want to sync
2. SSH access to production server
3. Database backup (recommended)

### Deployment Steps

```bash
# 1. SSH into production
ssh -i ~/ttkey root@129.212.178.244

# 2. Navigate to customer service
cd /opt/tailtown/services/customer

# 3. Upload CSV file (from local machine)
scp -i ~/ttkey gingr-calendar-2025-12-16.csv root@129.212.178.244:/tmp/

# 4. Run import (on server)
node scripts/import-gingr-lodging-csv.js /tmp/gingr-calendar-2025-12-16.csv b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05

# 5. Verify in Tailtown UI
# - Open calendar view
# - Check that reservations show correct kennel assignments
# - Verify Cooper shows D18 instead of D04Q
```

### Rollback (if needed)

If the import causes issues, restore from database backup:

```bash
# Restore from backup
docker exec -i tailtown-postgres psql -U postgres -d customer < /backup/customer_backup_YYYY-MM-DD.sql
```

---

## 🔄 Ongoing Sync Strategy

### Option 1: Weekly CSV Import (Recommended)

- Export Gingr calendar weekly (e.g., every Monday)
- Import CSV to sync any lodging changes
- **Pros:** Simple, reliable, no API limitations
- **Cons:** Manual process, not real-time

### Option 2: Daily CSV Import

- Automate CSV export via Gingr's download link (if available)
- Run import script via cron job
- **Pros:** More frequent updates
- **Cons:** Requires automation setup

### Option 3: Manual Sync as Needed

- Only run import when you notice mismatches
- Export specific date ranges from Gingr
- **Pros:** Minimal overhead
- **Cons:** Reactive, not proactive

---

## ⚠️ Important Notes

### CSV Format Requirements

- **Must include columns:** Animal, Owner, Start Date, Lodging
- **Column names are flexible:** Script searches for keywords (animal/pet, owner/customer, lodging/kennel/run, start date)
- **Empty lodging values are skipped** (no error)

### Reservation Matching Accuracy

- Script uses **fuzzy matching** (±1 day, partial name match)
- If multiple reservations match, it picks the first one
- Review "Not found" errors to identify mismatches

### Resource Auto-Creation

- Script **automatically creates missing resources**
- Resource type is inferred from name (K/Q/R suffix)
- Review created resources to ensure correct types

### Tenant ID

- Default tenant: `b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05` (Tailtown Pet Resort production)
- For dev/test: Use `dev` or appropriate tenant ID

---

## 🐛 Troubleshooting

### Error: "Required columns not found"

**Cause:** CSV headers don't match expected format  
**Solution:** Check CSV has Animal, Owner, Start Date, and Lodging columns (names can vary)

### Error: "Reservation not found"

**Cause:** No matching reservation in Tailtown for that pet/owner/date  
**Solutions:**

1. Check if reservation exists in Tailtown
2. Verify pet name spelling matches
3. Check date format and timezone
4. Run Gingr sync first to import missing reservations

### Error: "Resource creation failed"

**Cause:** Database constraint violation or invalid resource type  
**Solution:** Check if resource already exists with different type

### Many "Not found" errors

**Cause:** Reservations haven't been synced from Gingr yet  
**Solution:** Run full Gingr sync first, then re-run lodging import

---

## 📚 Related Documentation

- [Gingr API Reference](./GINGR-API-REFERENCE.md)
- [Gingr Sync Guide](./GINGR-SYNC-GUIDE.md)
- [Resource Management](../features/RESOURCE-MANAGEMENT.md)

---

## 🎯 Why CSV Instead of API?

### API Limitations Discovered

1. **`/api/v1/reservations`** (POST)

   - Returns basic reservation data
   - **No lodging field** for any reservation type
   - Tested with 57 reservations on 12/16/2025: zero lodging data

2. **`/api/v1/reservations_by_animal`** (GET)

   - Returns detailed reservation history for a pet
   - **No lodging field** in response
   - Tested with Cooper (animal_id: 18005): no lodging data

3. **`/api/v1/back_of_house`** (GET)
   - Returns checked-in reservations with `run_name` field
   - **Only includes boarding guests** (excludes Day Camp)
   - Tested: Shows boarding kennels but not Day Camp areas

### Gingr UI Shows Lodging

The Gingr web UI **Calendar Details** page clearly shows lodging assignments:

- Cooper Newill (Day Camp) → `D. Daycamp D 18`
- Dumbo Barragan (Boarding) → `A. Indoor - A 02`

**Conclusion:** Lodging data exists in Gingr's database but is not exposed via their public API. CSV export is the only reliable method to extract this data.

---

**Last Updated:** December 21, 2025  
**Status:** Production Ready  
**Tested:** Automatic sync correctly maps daycare lodging (e.g., Roxy → D27, Pancho → D22) and boarding assignments
