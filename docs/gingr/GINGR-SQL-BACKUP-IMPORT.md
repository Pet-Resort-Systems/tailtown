# Gingr SQL Backup Import Guide

This document describes how to import pet data from Gingr SQL backups into Tailtown.

## Overview

Gingr SQL backups contain comprehensive pet data that may not be available through the API, including:

- Pet photos (real URLs, not placeholders)
- Feeding instructions and dietary notes
- Medication information
- Allergies and sensitivities
- General behavioral and grooming notes
- Special requirements and flags

## Import Results (December 16, 2025)

### Photo Import

- **8,654 new photos** imported from SQL backup
- Photo coverage increased from **18% to 65.1%**
- Total pets with photos: **11,979 out of 18,405** active pets
- All photos are real, unique URLs from `storage.googleapis.com`

### Pet Data Import

- **15,116 pets** (82%) with food/feeding notes
- **4,595 pets** (25%) with medication notes
- **10,409 pets** (57%) with allergies documented
- **11,443 pets** (62%) with special requirements flags

## SQL Backup Structure

The Gingr MySQL backup contains an `animals` table with the following key fields:

| Gingr Field      | Tailtown Field        | Description                |
| ---------------- | --------------------- | -------------------------- |
| `first_name`     | `name`                | Pet name                   |
| `image`          | `profilePhoto`        | Photo URL                  |
| `feeding_notes`  | `foodNotes`           | Feeding instructions       |
| `medicines`      | `medicationNotes`     | Medication information     |
| `allergies`      | `allergies`           | Allergy information (HTML) |
| `notes`          | `notes`               | General notes (HTML)       |
| `grooming_notes` | `behaviorNotes`       | Grooming notes (HTML)      |
| `temperment`     | `specialRequirements` | Behavior flags             |
| `vip`            | -                     | VIP status flag            |
| `banned`         | `specialRequirements` | DO_NOT_BOOK flag           |

## Import Scripts

### 1. Photo Import Script

**Location:** `/opt/tailtown/services/customer/scripts/import-photos-from-sql-backup.js`

**Purpose:** Extracts pet photos from SQL backup and updates database

**Features:**

- Parses SQL INSERT statements to extract photo URLs
- Filters out placeholder images
- Matches pets by name (case-insensitive)
- Only updates pets without existing photos
- Provides detailed progress logging

**Usage:**

```bash
cd /opt/tailtown/services/customer
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/customer" \
  node scripts/import-photos-from-sql-backup.js
```

### 2. Batch Pet Data Import Script (RECOMMENDED)

**Location:** `/opt/tailtown/services/customer/scripts/import-pet-data-batch.js`

**Purpose:** Efficiently imports feeding notes, medications, allergies, and special requirements

**Features:**

- Loads all pets in one query (fast)
- Builds update map in memory
- Applies updates in batches of 100
- Completes in seconds instead of minutes
- Only updates empty fields (preserves existing data)

**Usage:**

```bash
cd /opt/tailtown/services/customer
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/customer" \
  node scripts/import-pet-data-batch.js
```

### 3. Individual Pet Data Import Script (DEPRECATED)

**Location:** `/opt/tailtown/services/customer/scripts/import-all-pet-data-from-sql.js`

**Note:** This script processes pets individually and is very slow (20+ minutes for 18,000 pets). Use the batch version instead.

## Performance Considerations

### Slow Approach (Individual Lookups)

```javascript
for (const data of petData) {
  const pets = await prisma.pet.findMany({ where: { name: data.name } });
  // Process each pet...
}
```

**Time:** 20+ minutes for 18,000 pets

### Fast Approach (Batch Processing)

```javascript
const allPets = await prisma.pet.findMany({ where: { isActive: true } });
const petMap = new Map();
// Build map, then apply updates in batches
```

**Time:** < 1 minute for 18,000 pets

## Data Mapping Details

### HTML Cleaning

Gingr stores notes with HTML formatting. The import scripts clean this:

- Remove HTML tags (`<p>`, `<br>`, etc.)
- Convert HTML entities (`&nbsp;` → space, `&amp;` → `&`)
- Trim whitespace

### Special Requirements Mapping

The scripts automatically add special requirement flags based on data:

| Condition                   | Flag Added       |
| --------------------------- | ---------------- |
| Has medication (not "none") | `HAS_MEDICATION` |
| Has allergies (not "none")  | `ALLERGIES`      |
| Banned flag set             | `DO_NOT_BOOK`    |

### Photo URL Filtering

The scripts skip placeholder images:

- URLs containing `c2ed8720-96f2-11ea-a7d5-ef010b7ec138`
- URLs containing `Screen Shot 2020-05-15`
- URLs containing `ajax-loader` or `default`

## Obtaining SQL Backups from Gingr

1. Contact Gingr support to request a database backup
2. Backup will be in `.sql.gz` format (compressed MySQL dump)
3. Upload to server: `/opt/tailtown/db-backup-[date].sql.gz`
4. Update script paths to point to new backup file

## Verification

After import, verify data in Tailtown:

### Dashboard & Pets Page

- Camera icons (📷) appear for pets with photos
- Special requirement icons display with tooltips
- Playgroup badges show compatibility

### Pet Detail Pages

- Food notes in feeding section
- Medication notes in medical section
- Allergy information displayed
- Behavioral/grooming notes visible

### Database Queries

```sql
-- Check photo coverage
SELECT COUNT(*) FROM pets WHERE "profilePhoto" IS NOT NULL AND "isActive" = true;

-- Check food notes
SELECT COUNT(*) FROM pets WHERE "foodNotes" IS NOT NULL AND "isActive" = true;

-- Check medications
SELECT COUNT(*) FROM pets WHERE "medicationNotes" IS NOT NULL AND "isActive" = true;

-- Check allergies
SELECT COUNT(*) FROM pets WHERE allergies IS NOT NULL AND "isActive" = true;
```

## Troubleshooting

### Script Hangs

- Use the batch version (`import-pet-data-batch.js`) instead of individual processing
- Check database connection and credentials
- Verify SQL backup file path is correct

### No Updates Applied

- Check if data was already imported in a previous run
- Verify pet names match between Gingr and Tailtown
- Ensure fields are empty (scripts only update null fields)

### Memory Issues

- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Process in smaller batches if needed

## Future Imports

For future SQL backups:

1. Upload new backup file to server
2. Update `SQL_BACKUP_PATH` in scripts
3. Run batch scripts in order:
   - Photos first
   - Pet data second
4. Verify results in database and frontend

## Related Documentation

- [Gingr API Integration](./GINGR-API-REFERENCE.md)
- [Gingr Lodging Sync](./GINGR-LODGING-SYNC-GUIDE.md)
- [Pet Data Schema](../schema/PET-SCHEMA.md)
