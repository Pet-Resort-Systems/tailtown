# Quick Start: Sync Kennel Assignments from Gingr

**Last Updated:** December 15, 2025  
**Status:** Production Ready

---

## 🎯 What This Does

Syncs kennel/lodging assignments from Gingr to Tailtown by importing a CSV/TSV export from Gingr's Calendar Details page.

**Example:**

- Gingr shows: Cooper → D18
- Tailtown shows: Cooper → D04Q (random assignment)
- After import: Cooper → D18 ✅

---

## 📋 Step-by-Step Instructions

### 1. Export from Gingr

1. Log into Gingr at https://tailtownpetresort.gingrapp.com
2. Navigate to **Calendar** → **Calendar Details**
3. Select the date (e.g., December 16, 2025)
4. Click the **Download** button (or use browser's "Save As" to export the table)
5. Save as `gingr-calendar-YYYY-MM-DD.tsv` or `.csv`

**Expected columns in export:**

- `a_first` (pet name)
- `o_last` (owner last name)
- `start_date` (reservation start)
- `run_name` (kennel assignment) ← **This is what we need!**

### 2. Upload to Production Server

```bash
# From your local Mac
scp -i ~/ttkey gingr-calendar-2025-12-16.tsv root@129.212.178.244:/tmp/
```

### 3. Run Import Script

```bash
# SSH into production
ssh -i ~/ttkey root@129.212.178.244

# Navigate to customer service
cd /opt/tailtown/apps/customer-service

# Run the import
node scripts/import-gingr-lodging-csv.js /tmp/gingr-calendar-2025-12-16.tsv b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
```

### 4. Review Results

The script will output:

```
🏨 Gingr Lodging Import from CSV
═══════════════════════════════════════

CSV File: /tmp/gingr-calendar-2025-12-16.tsv
Tenant: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05

Detected delimiter: TAB

✓ Cooper → D18 (D18)
✓ Audrey → D17 (D17)
✓ Shelby → D14 (D14)
✓ Bailey → D10 (D10)
  Created resource: D18 (STANDARD_SUITE)

📊 Import Summary
═══════════════════════════════════════
Total rows: 57
Updated: 55
Not found: 2
No lodging: 0
Errors: 2
```

### 5. Verify in Tailtown

1. Open Tailtown calendar: http://129.212.178.244:3000
2. Check reservations for the imported date
3. Verify kennel assignments match Gingr

---

## 🔧 What the Script Does

For each row in the CSV/TSV:

1. **Normalizes kennel name**: `"D  18"` → `D18`, `"A  02"` → `A02`
2. **Finds matching reservation** by pet name, owner, and date (±1 day tolerance)
3. **Finds or creates resource** (kennel) in Tailtown
4. **Updates `reservation.resourceId`** to link to the correct kennel

**Safe & Idempotent:**

- Can be run multiple times without duplicating data
- Only updates reservations that exist in Tailtown
- Creates missing resources automatically

---

## 📊 Sample Gingr Export Format

The script handles both **tab-delimited** (TSV) and **comma-delimited** (CSV) formats:

```
id	start_date	a_first	o_last	run_name	area_name
9182	2025-12-16 06:30:00	Cooper	Newill	D  18	D. Daycamp
8912	2025-12-14 06:30:00	Audrey	Saenz	D  17	D. Daycamp
6270	2025-12-16 06:30:00	Shelby	Dillman	D  14	D. Daycamp
```

**Key fields:**

- `a_first` = Pet name
- `o_last` = Owner last name
- `start_date` = Reservation start (YYYY-MM-DD HH:MM:SS)
- `run_name` = Kennel assignment (e.g., "D 18", "A 02")

---

## ⚠️ Troubleshooting

### "Not found" errors

**Cause:** Reservation doesn't exist in Tailtown for that pet/owner/date

**Solutions:**

1. Run Gingr sync first to import reservations:
   ```bash
   cd /opt/tailtown/apps/customer-service
   node scripts/incremental-gingr-sync.js b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
   ```
2. Check pet name spelling matches between Gingr and Tailtown
3. Verify date is correct (script allows ±1 day tolerance)

### "Required columns not found"

**Cause:** CSV doesn't have expected headers

**Solution:** Ensure export includes `a_first`, `o_last`, `start_date`, and `run_name` columns

### Script creates wrong resource type

**Cause:** Resource type is inferred from kennel name suffix

**Solution:** Manually update resource type in Tailtown admin panel after import

---

## 🔄 Recommended Sync Schedule

### Option 1: Weekly Import (Recommended)

- Export Gingr calendar every Monday
- Import to sync any lodging changes made during the week
- **Pros:** Catches manual changes, simple process
- **Cons:** Not real-time

### Option 2: After Major Changes

- Only run import when you notice mismatches
- Export specific date ranges from Gingr
- **Pros:** Minimal overhead
- **Cons:** Reactive, not proactive

### Option 3: Daily Automated Import

- Set up cron job to download and import daily
- **Pros:** Most up-to-date
- **Cons:** Requires automation setup

---

## 📁 File Locations

**Script:**

```
/opt/tailtown/apps/customer-service/scripts/import-gingr-lodging-csv.js
```

**Documentation:**

```
/opt/tailtown/docs/gingr/GINGR-LODGING-SYNC-GUIDE.md  (comprehensive)
/opt/tailtown/docs/gingr/QUICK-START-KENNEL-SYNC.md   (this file)
```

**Sample export:**

```
/tmp/gingr-calendar-YYYY-MM-DD.tsv
```

---

## 🎯 Success Criteria

After running the import, you should see:

✅ **Cooper Newill** (12/16) shows **D18** in Tailtown (not D04Q)  
✅ All boarding reservations have correct kennel assignments  
✅ All Day Camp reservations have correct area assignments  
✅ Resources (kennels) are created for any new assignments

---

## 💡 Pro Tips

1. **Export full day range:** Include past and future dates to catch any changes
2. **Run after Gingr sync:** Always sync reservations from Gingr first, then import lodging
3. **Check "Not found" errors:** These indicate reservations that need to be synced from Gingr
4. **Verify resource types:** Script infers types from names (K=King, Q=Queen, R=Junior)
5. **Keep exports:** Save CSV files for audit trail

---

## 🆘 Need Help?

**Common Issues:**

- Reservations not found → Run Gingr sync first
- Wrong kennel assignments → Check Gingr export has correct `run_name` values
- Script errors → Check Node.js version (need v18+)

**Full Documentation:**

- [GINGR-LODGING-SYNC-GUIDE.md](./GINGR-LODGING-SYNC-GUIDE.md) - Comprehensive guide
- [GINGR-API-REFERENCE.md](./GINGR-API-REFERENCE.md) - API documentation
- [GINGR-SYNC-GUIDE.md](./GINGR-SYNC-GUIDE.md) - Full sync documentation

---

**Ready to sync? Follow steps 1-5 above!** 🚀
