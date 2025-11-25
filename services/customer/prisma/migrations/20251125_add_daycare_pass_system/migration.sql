-- Migration: Add Daycare Pass System
-- Date: 2025-11-25
-- Description: Adds tables for multi-day daycare pass packages
-- SAFE: Only creates new tables, no modifications to existing data

-- Create enum for pass status
DO $$ BEGIN
    CREATE TYPE "DaycarePassStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create daycare_pass_packages table (tenant settings)
CREATE TABLE IF NOT EXISTS "daycare_pass_packages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "passCount" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "regularPricePerDay" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daycare_pass_packages_pkey" PRIMARY KEY ("id")
);

-- Create customer_daycare_passes table (customer purchases)
CREATE TABLE IF NOT EXISTS "customer_daycare_passes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "passesPurchased" INTEGER NOT NULL,
    "passesRemaining" INTEGER NOT NULL,
    "passesUsed" INTEGER NOT NULL DEFAULT 0,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "pricePerPass" DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "DaycarePassStatus" NOT NULL DEFAULT 'ACTIVE',
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_daycare_passes_pkey" PRIMARY KEY ("id")
);

-- Create daycare_pass_redemptions table (audit trail)
CREATE TABLE IF NOT EXISTS "daycare_pass_redemptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPassId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "reservationId" TEXT,
    "checkInId" TEXT,
    "passesBeforeUse" INTEGER NOT NULL,
    "passesAfterUse" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedBy" TEXT,
    "notes" TEXT,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversedAt" TIMESTAMP(3),
    "reversedBy" TEXT,
    "reversalReason" TEXT,

    CONSTRAINT "daycare_pass_redemptions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for daycare_pass_packages
CREATE UNIQUE INDEX IF NOT EXISTS "daycare_pass_packages_tenant_name_unique" ON "daycare_pass_packages"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "daycare_pass_packages_tenant_active_idx" ON "daycare_pass_packages"("tenantId", "isActive");

-- Create indexes for customer_daycare_passes
CREATE INDEX IF NOT EXISTS "customer_daycare_passes_tenant_customer_idx" ON "customer_daycare_passes"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "customer_daycare_passes_tenant_customer_status_idx" ON "customer_daycare_passes"("tenantId", "customerId", "status");
CREATE INDEX IF NOT EXISTS "customer_daycare_passes_tenant_expires_idx" ON "customer_daycare_passes"("tenantId", "expiresAt");

-- Create indexes for daycare_pass_redemptions
CREATE INDEX IF NOT EXISTS "daycare_pass_redemptions_tenant_pass_idx" ON "daycare_pass_redemptions"("tenantId", "customerPassId");
CREATE INDEX IF NOT EXISTS "daycare_pass_redemptions_tenant_pet_idx" ON "daycare_pass_redemptions"("tenantId", "petId");
CREATE INDEX IF NOT EXISTS "daycare_pass_redemptions_tenant_date_idx" ON "daycare_pass_redemptions"("tenantId", "redeemedAt");

-- Add foreign key constraint
ALTER TABLE "customer_daycare_passes" 
ADD CONSTRAINT "customer_daycare_passes_packageId_fkey" 
FOREIGN KEY ("packageId") REFERENCES "daycare_pass_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daycare_pass_redemptions" 
ADD CONSTRAINT "daycare_pass_redemptions_customerPassId_fkey" 
FOREIGN KEY ("customerPassId") REFERENCES "customer_daycare_passes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
