-- Add Loyalty Rewards System tables

BEGIN;

-- Create enums
DO $$ BEGIN
    CREATE TYPE "PointEarningType" AS ENUM ('DOLLARS_SPENT', 'VISIT', 'REFERRAL', 'BIRTHDAY', 'ANNIVERSARY', 'REVIEW', 'SOCIAL_SHARE', 'SERVICE_SPECIFIC');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "RedemptionType" AS ENUM ('DISCOUNT_PERCENTAGE', 'DISCOUNT_FIXED', 'FREE_SERVICE', 'FREE_ADDON', 'UPGRADE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "TierLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create loyalty_members table
CREATE TABLE IF NOT EXISTS "loyalty_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "customerId" TEXT NOT NULL,
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "currentTier" "TierLevel" NOT NULL DEFAULT 'BRONZE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_members_pkey" PRIMARY KEY ("id")
);

-- Create point_transactions table
CREATE TABLE IF NOT EXISTS "point_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "memberId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "PointEarningType" NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- Create point_redemptions table
CREATE TABLE IF NOT EXISTS "point_redemptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "memberId" TEXT NOT NULL,
    "pointsRedeemed" INTEGER NOT NULL,
    "redemptionType" "RedemptionType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "reservationId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "point_redemptions_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_members_customerId_key" ON "loyalty_members"("customerId");
CREATE INDEX IF NOT EXISTS "loyalty_member_tenant_customer_idx" ON "loyalty_members"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "point_transaction_tenant_member_idx" ON "point_transactions"("tenantId", "memberId");
CREATE INDEX IF NOT EXISTS "point_redemption_tenant_member_idx" ON "point_redemptions"("tenantId", "memberId");

-- Add foreign keys
DO $$ BEGIN
    ALTER TABLE "point_transactions" 
    ADD CONSTRAINT "point_transactions_memberId_fkey" 
    FOREIGN KEY ("memberId") REFERENCES "loyalty_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "point_redemptions" 
    ADD CONSTRAINT "point_redemptions_memberId_fkey" 
    FOREIGN KEY ("memberId") REFERENCES "loyalty_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

COMMIT;
