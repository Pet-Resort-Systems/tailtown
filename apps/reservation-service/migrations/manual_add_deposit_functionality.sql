-- Manual Migration: Add Deposit Functionality
-- Created: 2025-10-23
-- This migration is safe and will NOT delete any existing data

-- Step 1: Create new enum types
CREATE TYPE "DepositType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- Step 2: Add new values to InvoiceStatus enum
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'DEPOSIT_PAID';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- Step 3: Add deposit fields to services table
ALTER TABLE "services" 
  ADD COLUMN IF NOT EXISTS "depositRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "depositType" "DepositType",
  ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION;

-- Step 4: Add deposit tracking fields to invoices table
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Step 5: Update existing invoices to calculate balanceDue
UPDATE "invoices" 
SET "balanceDue" = "total" - "depositPaid"
WHERE "balanceDue" = 0;

-- Verification queries (run these to verify the migration worked)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'services' AND column_name LIKE 'deposit%';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices' AND column_name LIKE 'deposit%' OR column_name = 'balanceDue';
