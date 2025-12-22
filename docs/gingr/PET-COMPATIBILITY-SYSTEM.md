# Pet Compatibility System

**Last Updated:** December 15, 2025  
**Status:** Production Ready

---

## 🎯 Overview

The Pet Compatibility System is a comprehensive solution for tracking playgroup sizes, health requirements, behavioral traits, and special handling needs for pets. This system extracts rich compatibility data from Gingr's icon flags and stores it in a structured, queryable format in Tailtown.

## 📊 Data Captured from Gingr

### Playgroup Compatibility (652 pets)

| Flag Color           | Playgroup Size          | Count | Description                       |
| -------------------- | ----------------------- | ----- | --------------------------------- |
| **#8dc7a0** (green)  | `LARGE_DOG`             | 235   | Large dog playgroup               |
| **#c04de8** (purple) | `MEDIUM_DOG`            | 140   | Medium dog playgroup              |
| **#697db0** (blue)   | `SMALL_DOG`             | 131   | Small dog playgroup               |
| **#ff4a81** (pink)   | `NON_COMPATIBLE`        | 128   | No playgroup/individual only      |
| **#d1b41e** (yellow) | `SENIOR_STAFF_REQUIRED` | 18    | Requires senior staff supervision |

### Special Requirements (43 unique types)

**Health Flags (281 total):**

- Medications, allergies, special needs
- Heat sensitivity, seizure watch, heart issues
- Physical limitations (blind, deaf, wheelchair)
- Pool restrictions, leash restrictions

**Behavior Flags (179 total):**

- Feeding requirements (separate feeding)
- Behavioral traits (poop eater, chewer, runner)
- Pool preferences, bedding needs

**Aggression Flags (78 total):**

- Toy/food/room aggressive
- Leash aggressive, fence fighter
- Biter, use caution flags

**Grooming Flags (37 total):**

- Preferred groomers
- Grooming notes and sensitivities

**Customer Info (261 total):**

- Permanent run cards
- Senior discounts
- Special booking restrictions

---

## 🗄️ Database Schema

### New Fields on Pet Model

```prisma
model Pet {
  // ... existing fields ...

  // Comprehensive Compatibility System
  playgroupCompatibility PlaygroupCompatibility?
  specialRequirements    SpecialRequirement[]    @default([])
  compatibilityNotes     String?
  healthFlags            Json?                    // Array of health flag objects
  behaviorFlags          Json?                    // Array of behavior flag objects
  aggressionFlags        Json?                    // Array of aggression flag objects
  groomingPreferences    Json?                    // Grooming preferences
  staffRequirements      Json?                    // Staff requirements
}
```

### Enums

**PlaygroupCompatibility:**

```prisma
enum PlaygroupCompatibility {
  LARGE_DOG
  MEDIUM_DOG
  SMALL_DOG
  NON_COMPATIBLE
  SENIOR_STAFF_REQUIRED
  UNKNOWN
}
```

**SpecialRequirement (63 values):**

```prisma
enum SpecialRequirement {
  // Health (13)
  HAS_MEDICATION
  MEDICAL_MONITORING
  ALLERGIES
  HEAT_SENSITIVE
  NO_POOL
  NO_LEASH_ON_NECK
  BLIND
  DEAF
  SPECIAL_NEEDS
  SEIZURE_WATCH
  HEART_ISSUE
  CONTROLLED_SUBSTANCE
  NEEDS_EXTRA_BEDDING

  // Behavior (10)
  SEPARATE_FEEDING
  POOP_EATER
  STRONG_PULLER
  CHEWER
  NO_BEDDING
  EXCESSIVE_MOUNTER
  LOVES_POOL
  RUNNER
  NO_COT
  EXCESSIVE_DRINKER

  // Aggression (8)
  TOY_AGGRESSIVE
  LEASH_AGGRESSIVE
  BITER
  USE_CAUTION
  FENCE_FIGHTER
  ROOM_AGGRESSIVE
  MALE_AGGRESSIVE
  GENERAL_AGGRESSION

  // Grooming (3)
  PREFERRED_GROOMER
  GROOMING_NOTES
  SENSITIVE_SKIN

  // Customer Info (3)
  PERMANENT_RUN_CARD
  SENIOR_DISCOUNT
  DO_NOT_BOOK
}
```

### JSON Field Structures

**healthFlags / behaviorFlags / aggressionFlags:**

```json
[
  {
    "icon": "fa-allergies",
    "color": "#c90076",
    "title": "Allergies",
    "content": "very strict diet",
    "category": "Health"
  }
]
```

**groomingPreferences:**

```json
{
  "preferredGroomer": "Jenny",
  "notes": "SENSITIVE SKIN - hypo shampoo",
  "sensitiveSkin": true
}
```

**staffRequirements:**

```json
{
  "seniorStaffRequired": true,
  "specialHandling": true,
  "notes": "go slow when putting on and taking off leash"
}
```

---

## 🚀 Deployment

### Step 1: Run Database Migration

```bash
cd /opt/tailtown/services/customer

# Run migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Restart service
pm2 restart customer-service
```

### Step 2: Import Compatibility Data

```bash
# Upload import script to production
scp -i ~/ttkey services/customer/scripts/import-gingr-compatibility.js root@129.212.178.244:/opt/tailtown/services/customer/scripts/

# SSH into production
ssh -i ~/ttkey root@129.212.178.244

# Run import for all dates
cd /opt/tailtown/services/customer
for file in /tmp/Reservations*.csv; do
  echo "Processing: $file"
  node scripts/import-gingr-compatibility.js "$file" b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
done
```

### Step 3: Verify Import

```bash
# Check compatibility data
cd /opt/tailtown/services/customer
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const stats = await prisma.pet.groupBy({
    by: ['playgroupCompatibility'],
    _count: true
  });
  console.log('Playgroup Distribution:');
  stats.forEach(s => console.log(\`  \${s.playgroupCompatibility || 'None'}: \${s._count}\`));

  const withFlags = await prisma.pet.count({
    where: { specialRequirements: { isEmpty: false } }
  });
  console.log(\`\nPets with special requirements: \${withFlags}\`);

  await prisma.\$disconnect();
})();
"
```

---

## 📖 Usage Examples

### Query Pets by Playgroup

```typescript
// Get all large dog playgroup pets
const largeDogs = await prisma.pet.findMany({
  where: {
    playgroupCompatibility: "LARGE_DOG",
    isActive: true,
  },
  include: {
    owner: true,
  },
});
```

### Query Pets with Special Requirements

```typescript
// Find pets with medication requirements
const petsWithMeds = await prisma.pet.findMany({
  where: {
    specialRequirements: {
      has: "HAS_MEDICATION",
    },
  },
});

// Find aggressive pets
const aggressivePets = await prisma.pet.findMany({
  where: {
    specialRequirements: {
      hasSome: ["TOY_AGGRESSIVE", "LEASH_AGGRESSIVE", "BITER"],
    },
  },
});
```

### Get Full Compatibility Profile

```typescript
const pet = await prisma.pet.findUnique({
  where: { id: petId },
  select: {
    name: true,
    playgroupCompatibility: true,
    specialRequirements: true,
    healthFlags: true,
    behaviorFlags: true,
    aggressionFlags: true,
    groomingPreferences: true,
    staffRequirements: true,
    compatibilityNotes: true,
  },
});

console.log(`${pet.name} Compatibility Profile:`);
console.log(`  Playgroup: ${pet.playgroupCompatibility}`);
console.log(`  Special Requirements: ${pet.specialRequirements.join(", ")}`);
console.log(`  Health Flags: ${pet.healthFlags?.length || 0}`);
console.log(`  Behavior Flags: ${pet.behaviorFlags?.length || 0}`);
console.log(`  Aggression Flags: ${pet.aggressionFlags?.length || 0}`);
```

---

## 🎨 Frontend Display Components

### Compatibility Badge Component

```tsx
import { Chip } from "@mui/material";

const PlaygroupBadge = ({ compatibility }) => {
  const config = {
    LARGE_DOG: { label: "Large Group", color: "#8dc7a0" },
    MEDIUM_DOG: { label: "Medium Group", color: "#c04de8" },
    SMALL_DOG: { label: "Small Group", color: "#697db0" },
    NON_COMPATIBLE: { label: "Solo Only", color: "#ff4a81" },
    SENIOR_STAFF_REQUIRED: { label: "Senior Staff", color: "#d1b41e" },
  };

  const { label, color } = config[compatibility] || {};

  return (
    <Chip
      label={label}
      sx={{ backgroundColor: color, color: "white" }}
      size="small"
    />
  );
};
```

### Flag Display Component

```tsx
const FlagDisplay = ({ flags, category }) => {
  if (!flags || flags.length === 0) return null;

  return (
    <Box>
      <Typography variant="subtitle2">{category}</Typography>
      {flags.map((flag, idx) => (
        <Tooltip key={idx} title={flag.content}>
          <Chip
            icon={<i className={flag.icon} style={{ color: flag.color }} />}
            label={flag.title}
            size="small"
            sx={{ m: 0.5 }}
          />
        </Tooltip>
      ))}
    </Box>
  );
};
```

---

## 🔍 Reporting & Analytics

### Playgroup Distribution Report

```sql
SELECT
  "playgroupCompatibility",
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM pets
WHERE "isActive" = true
GROUP BY "playgroupCompatibility"
ORDER BY count DESC;
```

### Special Requirements Summary

```sql
SELECT
  unnest("specialRequirements") as requirement,
  COUNT(*) as count
FROM pets
WHERE "isActive" = true
GROUP BY requirement
ORDER BY count DESC;
```

### Pets Requiring Special Attention

```sql
SELECT
  p.name,
  c."firstName" || ' ' || c."lastName" as owner,
  p."playgroupCompatibility",
  array_length(p."specialRequirements", 1) as flag_count,
  p."specialRequirements"
FROM pets p
JOIN customers c ON p."customerId" = c.id
WHERE
  p."isActive" = true
  AND (
    p."playgroupCompatibility" = 'SENIOR_STAFF_REQUIRED'
    OR 'BITER' = ANY(p."specialRequirements")
    OR 'GENERAL_AGGRESSION' = ANY(p."specialRequirements")
  )
ORDER BY flag_count DESC;
```

---

## 🔄 Ongoing Sync Strategy

### Option 1: Include in Regular Gingr Sync

Modify the existing Gingr sync to also update compatibility data when syncing pets.

### Option 2: Weekly Compatibility Refresh

Run the compatibility import script weekly to capture any flag changes in Gingr.

```bash
# Add to cron (runs every Sunday at 2 AM)
0 2 * * 0 cd /opt/tailtown/services/customer && node scripts/import-gingr-compatibility.js /path/to/latest-export.csv b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
```

### Option 3: On-Demand Import

Run manually when you notice compatibility changes in Gingr or before major events.

---

## ⚠️ Important Notes

1. **Idempotent Import**: The import script can be run multiple times safely - it updates existing data without duplication.

2. **Pet Matching**: Pets are matched by name and owner. Ensure pet names in Tailtown match Gingr for accurate imports.

3. **Flag Evolution**: As Gingr adds new flags, update the `SPECIAL_REQUIREMENTS_MAP` in the import script.

4. **Performance**: The JSONB fields are indexed with GIN indexes for fast querying.

5. **Data Integrity**: All compatibility data is preserved in JSON format, so no information is lost even if new flag types appear.

---

## 📋 Checklist for Production

- [ ] Run database migration
- [ ] Regenerate Prisma client
- [ ] Restart customer service
- [ ] Upload import script to production
- [ ] Run import for all Gingr exports
- [ ] Verify data with sample queries
- [ ] Update API endpoints to return compatibility data
- [ ] Create frontend components for display
- [ ] Add compatibility filters to pet search
- [ ] Document for staff training
- [ ] Set up ongoing sync schedule

---

## 🆘 Troubleshooting

**Issue:** Import script shows "pet not found" errors

**Solution:** Pet names in Tailtown must match Gingr. Check for:

- Extra spaces in names
- Different capitalization
- Nicknames vs full names

**Issue:** Playgroup compatibility not showing

**Solution:** Ensure the CSV export includes the `icons_string` column from Gingr's Calendar Details page.

**Issue:** Special requirements array is empty

**Solution:** Verify the `SPECIAL_REQUIREMENTS_MAP` includes all flag titles from your Gingr instance.

---

**Ready to make your staff VERY happy with comprehensive pet compatibility tracking!** 🎉
