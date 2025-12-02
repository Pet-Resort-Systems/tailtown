# Pet Notes Sync - Deployment Guide

**Date:** November 19, 2025  
**Feature:** Add general notes field to Pet model and sync from Gingr

## Overview

Added a `notes` field to the Pet model to store general notes from Gingr's `animal.notes` field. This complements the existing specific note fields (medication, food, behavior, etc.).

## Changes Made

### 1. Database Schema
**File:** `/services/customer/prisma/schema.prisma`

Added `notes` field to Pet model:
```prisma
model Pet {
  // ... existing fields
  specialNeeds       String?
  notes              String?         // General notes from Gingr
  foodNotes          String?
  // ... rest of fields
}
```

### 2. Gingr Sync Service
**File:** `/services/customer/src/services/gingr-sync.service.ts`

Updated pet sync to include notes:
```typescript
const petData: any = {
  name: animal.first_name,
  // ... other fields
  notes: animal.notes,  // NEW: General notes from Gingr
  medicationNotes: animal.medicines,
  // ... rest of fields
};
```

### 3. Database Migration
**File:** `/services/customer/prisma/migrations/20251119_add_pet_notes/migration.sql`

```sql
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "notes" TEXT;
COMMENT ON COLUMN "pets"."notes" IS 'General notes from Gingr animal.notes field';
```

## Notes Fields Summary

After this update, pets will have the following notes fields synced from Gingr:

| Database Field | Gingr Field | Description |
|----------------|-------------|-------------|
| `notes` | `animal.notes` | **NEW** - General notes |
| `medicationNotes` | `animal.medicines` | Medication information |
| `foodNotes` | `animal.feeding_notes` | Feeding instructions |
| `behaviorNotes` | `animal.grooming_notes` | Grooming/behavior notes |
| `specialNeeds` | `animal.temperment` | Temperament/special needs |
| `allergies` | `animal.allergies` | Allergy information |

## Deployment Steps

### Step 1: Deploy to Production

```bash
# On LOCAL machine:
cd /Users/robweinstein/CascadeProjects/tailtown/services/customer

# Copy files to production
scp -i ~/ttkey dist/services/gingr-sync.service.js root@129.212.178.244:/opt/tailtown/services/customer/dist/services/
scp -i ~/ttkey dist/services/gingr-sync.service.js.map root@129.212.178.244:/opt/tailtown/services/customer/dist/services/
scp -r -i ~/ttkey prisma/migrations/20251119_add_pet_notes root@129.212.178.244:/opt/tailtown/services/customer/prisma/migrations/
```

### Step 2: Run Migration on Production

```bash
# SSH into production
ssh -i ~/ttkey root@129.212.178.244

# Navigate to customer service
cd /opt/tailtown/services/customer

# Run the migration
psql postgresql://postgres:TailtownSecure2025ProductionDB@localhost:5432/customer -f prisma/migrations/20251119_add_pet_notes/migration.sql

# Verify the column was added
psql postgresql://postgres:TailtownSecure2025ProductionDB@localhost:5432/customer -c "\d pets" | grep notes
```

Expected output:
```
 notes              | text                        |           |          | 
 foodNotes          | text                        |           |          | 
 medicationNotes    | text                        |           |          | 
 behaviorNotes      | text                        |           |          | 
 iconNotes          | jsonb                       |           |          |
```

### Step 3: Restart Service

```bash
# Still on production server
pm2 restart customer-service

# Check logs
pm2 logs customer-service --lines 20
```

### Step 4: Sync Pet Notes

The notes will be synced on the next:
- **Hourly incremental sync** (reservations only - won't sync pet notes)
- **Full Gingr sync** (syncs all pets with notes)

To sync pet notes immediately, run a full sync:

```bash
# On production server
cd /opt/tailtown/services/customer

# Run full sync (this will take 5-10 minutes)
node dist/index.js sync-gingr

# Or use the sync endpoint
curl -X POST http://localhost:4004/api/gingr/sync \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05"
```

## Verification

### Check if notes were synced:

```sql
-- Count pets with notes
SELECT COUNT(*) as pets_with_notes
FROM pets
WHERE "tenantId" = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05'
  AND notes IS NOT NULL
  AND notes != '';

-- View sample notes
SELECT name, LEFT(notes, 100) as notes_preview
FROM pets
WHERE "tenantId" = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05'
  AND notes IS NOT NULL
  AND notes != ''
LIMIT 10;
```

## Rollback

If needed, to remove the notes field:

```sql
ALTER TABLE "pets" DROP COLUMN IF EXISTS "notes";
```

Then revert the code changes and restart the service.

## Frontend Display

To display pet notes in the frontend, update the pet detail/profile components to show the `notes` field alongside other note fields.

Example locations:
- Pet profile page
- Pet edit form
- Reservation details (pet information section)

## Related Documentation

- [Overnight Reservation Fix](./OVERNIGHT_RESERVATION_FIX_2025-11-19.md)
- [Gingr Sync Guide](./gingr/GINGR-SYNC-GUIDE.md)
- [Incremental Sync](../services/customer/scripts/README-INCREMENTAL-SYNC.md)

---

**Status:** ✅ Ready for deployment  
**Impact:** Low - Additive change only  
**Downtime:** None (migration is non-blocking)  
**Testing:** Verify notes sync after full Gingr sync
