-- Add Coupon System tables
-- Non-destructive migration that adds coupon functionality

BEGIN;

-- Create CouponType enum
DO $$ BEGIN
    CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create CouponStatus enum
DO $$ BEGIN
    CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create coupons table
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minimumPurchase" DOUBLE PRECISION,
    "serviceIds" TEXT,
    "firstTimeCustomersOnly" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxTotalUses" INTEGER,
    "maxUsesPerCustomer" INTEGER NOT NULL DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "isReferralCoupon" BOOLEAN NOT NULL DEFAULT false,
    "referralCustomerId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- Create coupon_usages table
CREATE TABLE IF NOT EXISTS "coupon_usages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "couponId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_tenant_code_unique" ON "coupons"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "coupons_tenant_status_idx" ON "coupons"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "coupons_tenant_dates_idx" ON "coupons"("tenantId", "validFrom", "validUntil");
CREATE INDEX IF NOT EXISTS "coupon_usage_tenant_coupon_idx" ON "coupon_usages"("tenantId", "couponId");
CREATE INDEX IF NOT EXISTS "coupon_usage_tenant_customer_idx" ON "coupon_usages"("tenantId", "customerId");

-- Add foreign key
DO $$ BEGIN
    ALTER TABLE "coupon_usages" 
    ADD CONSTRAINT "coupon_usages_couponId_fkey" 
    FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMIT;
