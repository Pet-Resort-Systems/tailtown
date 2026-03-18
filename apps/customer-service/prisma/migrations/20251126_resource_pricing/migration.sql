-- Migration: Add resource pricing and new resource types
-- Date: 2025-11-26
-- Description: Adds price field to resources and new resource type enum values

-- Add new enum values to ResourceType
-- Note: PostgreSQL requires adding enum values one at a time
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'JUNIOR_KENNEL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'QUEEN_KENNEL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'KING_KENNEL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'VIP_ROOM';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'CAT_CONDO';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'DAY_CAMP_FULL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'DAY_CAMP_HALF';

-- Add price and taxable columns to resources table
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "taxable" BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN "resources"."price" IS 'Nightly/daily rate for this resource';
