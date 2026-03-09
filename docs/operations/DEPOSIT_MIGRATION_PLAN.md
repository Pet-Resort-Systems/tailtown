# Deposit Functionality Migration Plan

**Created**: October 23, 2025  
**Status**: PENDING REVIEW  
**Risk Level**: LOW (Additive changes only)

## Overview

This document outlines the plan to add deposit functionality to the Tailtown system. All changes are **additive** (new columns with defaults) and will **NOT delete any existing data**.

## Database Backup Status

✅ **Backup Created**: `backups/reservation_backup_20251023_111002.sql` (17KB)
- Location: `/Users/robweinstein/CascadeProjects/tailtown/backups/`
- Database: `reservation`
- Created: October 23, 2025 11:10 AM

### Restore Command (if needed):
```bash
docker exec -i tailtown-postgres psql -U postgres -d reservation < backups/reservation_backup_20251023_111002.sql
```

## Current Database State

### Existing Tables:
- `service` - Service definitions
- `reservation` - Reservations
- `customer` - Customer records
- `pet` - Pet records
- `add_on_service` - Add-on services
- `reservation_add_on` - Reservation add-ons
- `resource` - Resources (suites, kennels)

### Missing Tables (Need to be created):
- `invoices` - Invoice tracking
- `invoice_line_items` - Invoice line items
- `payments` - Payment records

## Schema Changes Required

### 1. New Enum Types

#### DepositType (NEW)
```sql
CREATE TYPE "DepositType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
```

#### InvoiceStatus (NEW - for future invoice table)
```sql
CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'DEPOSIT_PAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'REFUNDED'
);
```

### 2. Service Table Changes

**Add columns:**
```sql
ALTER TABLE "service" 
  ADD COLUMN IF NOT EXISTS "depositRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "depositType" "DepositType",
  ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION;
```

**Impact**: 
- ✅ No data loss
- ✅ All existing services will have `depositRequired = false`
- ✅ Nullable fields allow gradual configuration

### 3. Invoice Table (Future - when invoicing is implemented)

When the invoice system is built, it will include:
```sql
CREATE TABLE "invoices" (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL DEFAULT 'dev',
  invoiceNumber TEXT NOT NULL,
  customerId TEXT NOT NULL,
  reservationId TEXT,
  issueDate TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dueDate TIMESTAMP(3) NOT NULL,
  status "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  subtotal DOUBLE PRECISION NOT NULL,
  taxRate DOUBLE PRECISION NOT NULL DEFAULT 0,
  taxAmount DOUBLE PRECISION NOT NULL DEFAULT 0,
  discount DOUBLE PRECISION NOT NULL DEFAULT 0,
  total DOUBLE PRECISION NOT NULL,
  depositAmount DOUBLE PRECISION NOT NULL DEFAULT 0,
  depositPaid DOUBLE PRECISION NOT NULL DEFAULT 0,
  balanceDue DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL
);
```

## Migration Steps

### Step 1: Schema Sync (REQUIRED FIRST)

The current database schema is out of sync with the Prisma schema. We need to:

1. Run `pnpm exec prisma db push` to sync the schema
2. This will create missing tables and columns
3. **OR** run a full Prisma migration

**Decision needed**: Do you want to:
- A) Sync the entire schema now (recommended)
- B) Only add deposit fields manually

### Step 2: Add Deposit Fields

Once schema is synced, run:
```bash
cd apps/reservation-service
source ~/.nvm/nvm.sh
pnpm exec prisma db push
```

This will:
- Create `DepositType` enum
- Add deposit fields to `service` table
- Create invoice-related tables (if they don't exist)
- Add deposit tracking to invoices

### Step 3: Regenerate Prisma Client

```bash
cd apps/reservation-service
pnpm exec prisma generate
```

### Step 4: Restart Services

```bash
# Kill existing services
lsof -ti:4003 | xargs kill -9

# Start reservation service
cd apps/reservation-service
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev
```

## Verification Steps

After migration:

1. **Verify service table:**
```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'service' 
AND column_name LIKE 'deposit%';
```

Expected output:
```
depositRequired | boolean | NO  | false
depositType     | USER-DEFINED | YES | NULL
depositAmount   | double precision | YES | NULL
```

2. **Verify enum created:**
```sql
\dT+ DepositType
```

3. **Verify no data loss:**
```sql
SELECT COUNT(*) FROM service;
SELECT COUNT(*) FROM reservation;
SELECT COUNT(*) FROM customer;
```

Compare counts with pre-migration values.

## Rollback Plan

If anything goes wrong:

```bash
# Stop services
lsof -ti:4003 | xargs kill -9

# Restore database
docker exec -i tailtown-postgres psql -U postgres -d reservation < backups/reservation_backup_20251023_111002.sql

# Revert Prisma schema changes
git checkout HEAD -- apps/reservation-service/prisma/schema.prisma

# Regenerate client
cd apps/reservation-service
pnpm exec prisma generate

# Restart services
source ~/.nvm/nvm.sh && PORT=4003 pnpm run dev
```

## Risk Assessment

### Low Risk ✅
- Adding new columns with defaults
- Creating new enum types
- No data deletion
- No column type changes
- Backup created

### Medium Risk ⚠️
- Schema sync might reveal other drift issues
- Prisma might want to reset if it detects major drift

### Mitigation
- Backup already created
- Manual SQL option available
- Can rollback easily
- Test on dev database first

## Next Steps

**AWAITING YOUR APPROVAL TO PROCEED**

Choose one:
1. **Full Schema Sync** (Recommended) - Sync entire Prisma schema with database
2. **Manual Deposit Fields Only** - Add just deposit fields via SQL
3. **Review More** - Review this plan and ask questions

## Questions to Consider

1. Are there any active reservations or orders in progress?
2. Is this a development or production database?
3. Do you want to proceed with full schema sync or just deposit fields?
4. Should we test on a separate database first?

---

**Status**: Waiting for approval to proceed
**Backup**: ✅ Created and verified
**Risk**: LOW (additive changes only)
**Estimated Time**: 5-10 minutes
