-- Add PriceAdjustmentType enum and adjustmentType field to price_rules table
-- This is a non-destructive migration that adds new functionality

BEGIN;

-- Create the PriceAdjustmentType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "PriceAdjustmentType" AS ENUM ('DISCOUNT', 'SURCHARGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add adjustmentType column with default value
ALTER TABLE "price_rules" 
ADD COLUMN IF NOT EXISTS "adjustmentType" "PriceAdjustmentType" NOT NULL DEFAULT 'DISCOUNT';

COMMIT;
