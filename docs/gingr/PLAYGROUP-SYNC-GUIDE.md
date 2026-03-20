# Gingr Playgroup Assignment Sync Guide

**Date:** December 21, 2025  
**Status:** Production Ready  
**Method:** CSV Import (Gingr API does not expose flag/icon data)

---

## 🎯 Problem Statement

Tailtown needs to match Gingr's playgroup assignments, which are indicated by colored flag icons in Gingr:

- **Green Flag (#8dc7a0)** = Large Dog Playgroup
- **Blue Flag (#697db0)** = Small Dog Playgroup
- **Purple Flag (#c04de8)** = Medium Dog Playgroup
- **Pink/Fuchsia Flag (#ff4a81)** = Non-Compatible (Solo Play Only)

However, Gingr's API does not expose icon/flag data. This information is only visible in CSV exports from Gingr's web UI.

---

## ✅ Solution: CSV Import

### Step 1: Export from Gingr

1. **Log into Gingr** → Navigate to **Calendar**
2. **Select a date range** (e.g., any week with active reservations)
3. Click **"Download"** button (top right of Calendar Details page)
4. Save the CSV file (e.g., `Reservations For Saturday, 12_20_2025.csv`)

### Step 2: Import Playgroup Assignments

```bash
# On production server
cd /opt/tailtown/apps/customer-service

# Upload CSV from local machine
scp -i ~/.ssh/github_ed25519 "Reservations For Saturday, 12_20_2025.csv" root@129.212.178.244:/tmp/gingr-playgroups.csv

# Run import script
node scripts/import-playgroup-from-gingr-csv.js /tmp/gingr-playgroups.csv
```

**What the script does:**

1. Parses the CSV file
2. Extracts flag colors from the `icons_string` column:
   - `color:#8dc7a0` + "Playgroup" → `LARGE_DOG`
   - `color:#697db0` + "Playgroup" → `SMALL_DOG`
   - `color:#c04de8` + "PlayGroup" → `MEDIUM_DOG`
   - `color:#ff4a81` + "Non Compat" → `NON_COMPATIBLE` (Solo Play)
3. Finds matching pets in Tailtown by Gingr external ID
4. Updates `pet.playgroupCompatibility` field

---

## 📊 Example Output

```
🐕 Gingr Playgroup Import from CSV
═══════════════════════════════════════
CSV File: /tmp/gingr-playgroups.csv
Tenant: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05

Processed 68 pets from CSV

Updating database...

✓ Lucy → LARGE_DOG
✓ Miles → LARGE_DOG
✓ Kuma → MEDIUM_DOG
✓ Oliver → LARGE_DOG
✓ Martina → SMALL_DOG
✓ Cinnamon → SMALL_DOG
✓ Dozer → NON_COMPATIBLE
✓ Yoda → NON_COMPATIBLE
...

📊 Import Summary
═══════════════════════════════════════
Total processed: 68
Updated: 48
Skipped (no flag): 20
Not found: 0

✅ Import complete
```

---

## 🔄 Sync Behavior

### Playgroup Assignments are Preserved

The Gingr sync service **does NOT overwrite** playgroup assignments. The sync only updates "core Gingr fields" (name, breed, weight, etc.) and preserves Tailtown-managed fields including:

- `playgroupCompatibility`
- `profilePhoto`
- `notes`, `medicationNotes`, `allergies`
- `foodNotes`, `behaviorNotes`, `specialNeeds`
- `vaccinationStatus`, `vaccineExpirations`
- `petIcons`, `specialRequirements`

This means once you import playgroup assignments via CSV, they will be maintained through future automatic syncs.

---

## 📅 Recommended Workflow

### Initial Setup (One-time)

1. Export a CSV from Gingr with current reservations
2. Run the playgroup import script
3. Verify assignments in Tailtown

### Ongoing Maintenance

**Option 1: Quarterly Updates** (Recommended)

- Export CSV from Gingr every 3 months
- Run import script to catch any new pets or changed assignments
- **Why:** Playgroup assignments rarely change once established

**Option 2: As-Needed Updates**

- Only run import when you notice incorrect playgroup assignments
- Or when onboarding a batch of new pets
- **Why:** Minimal overhead, reactive approach

**Option 3: Monthly Updates**

- Export CSV from Gingr monthly
- Run import script to stay synchronized
- **Why:** More frequent updates, proactive approach

---

## 🔍 Verification

After importing, verify playgroup assignments:

```bash
# SSH into production
ssh -i ~/.ssh/github_ed25519 root@129.212.178.244

# Query playgroup distribution
cd /opt/tailtown/apps/customer-service
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const counts = await prisma.pet.groupBy({
    by: ['playgroupCompatibility'],
    where: { tenantId: 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05', isActive: true },
    _count: true
  });
  console.log('Playgroup Distribution:');
  counts.forEach(c => console.log(\`  \${c.playgroupCompatibility || 'UNKNOWN'}: \${c._count}\`));
  await prisma.\$disconnect();
})();
"
```

---

## ⚠️ Important Notes

### CSV Format Requirements

- **Must include columns:** `a_id` (pet ID), `a_first` (pet name), `icons_string` (flag colors)
- **Column names are case-sensitive**
- The script looks for flag colors in the `icons_string` HTML

### Playgroup Flag Colors

The exact color codes used by Gingr:

- **Large Dog Playgroup**: `#8dc7a0` (green)
- **Small Dog Playgroup**: `#697db0` (blue)
- **Medium Dog PlayGroup**: `#c04de8` (purple)
- **Non-Compatible (Solo Play)**: `#ff4a81` (pink/fuchsia)

Note: Gingr uses "PlayGroup" (capital G) for Medium dogs, but "Playgroup" for Large/Small. Non-Compatible uses "Non Compat" text.

### Pets Without Flags

Pets without playgroup flags in Gingr will be skipped during import. Their `playgroupCompatibility` field will remain unchanged (or `null` for new pets).

---

## 🐛 Troubleshooting

### Error: "Module 'csv-parser' not found"

```bash
cd /opt/tailtown/apps/customer-service
pnpm add csv-parser
```

### Error: "Pet not found"

**Cause:** Pet doesn't exist in Tailtown yet  
**Solution:** Run full Gingr sync first to import all pets, then re-run playgroup import

### Many pets skipped (no flag)

**Cause:** Pets don't have playgroup flags assigned in Gingr  
**Solution:** This is expected. Only pets with flags will be updated. Assign flags in Gingr if needed.

---

## 📚 Related Documentation

- [Gingr Sync Guide](./GINGR-SYNC-GUIDE.md)
- [Gingr Lodging Sync Guide](./GINGR-LODGING-SYNC-GUIDE.md)
- [Pet Management](../features/PET-MANAGEMENT.md)

---

**Last Updated:** December 21, 2025  
**Status:** Production Ready  
**Tested:** Successfully imported 40 pet playgroup assignments (19 large, 13 small, 8 medium)
