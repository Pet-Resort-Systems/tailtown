-- Add permanent coupon link to customers
-- This allows customers to have a permanent discount (military, senior, first responder, etc.)
-- that automatically applies at checkout

-- Add permanentCouponId column to customers table
ALTER TABLE "customers" ADD COLUMN "permanentCouponId" TEXT;

-- Add foreign key constraint
ALTER TABLE "customers" ADD CONSTRAINT "customers_permanentCouponId_fkey" 
  FOREIGN KEY ("permanentCouponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for faster lookups
CREATE INDEX "customers_permanentCouponId_idx" ON "customers"("permanentCouponId");
