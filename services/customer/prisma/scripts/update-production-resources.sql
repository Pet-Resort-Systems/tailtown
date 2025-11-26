-- Production Resource Update SQL Script
-- Run this after running the enum migration (20251126_resource_pricing/migration.sql)
--
-- Usage: psql -d <database_name> -f update-production-resources.sql

-- First, ensure the new enum values exist
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'JUNIOR_KENNEL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'QUEEN_KENNEL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'KING_KENNEL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'VIP_ROOM';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'CAT_CONDO';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'DAY_CAMP_FULL';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'DAY_CAMP_HALF';

-- Add price and taxable columns if they don't exist
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "taxable" BOOLEAN NOT NULL DEFAULT true;

-- Update resources based on name patterns
-- Junior kennels (names containing 'junior' case-insensitive)
UPDATE "resources" 
SET type = 'JUNIOR_KENNEL', price = 45.00, taxable = true
WHERE LOWER(name) LIKE '%junior%';

-- Queen kennels
UPDATE "resources" 
SET type = 'QUEEN_KENNEL', price = 55.00, taxable = true
WHERE LOWER(name) LIKE '%queen%';

-- King kennels
UPDATE "resources" 
SET type = 'KING_KENNEL', price = 75.00, taxable = true
WHERE LOWER(name) LIKE '%king%';

-- VIP rooms
UPDATE "resources" 
SET type = 'VIP_ROOM', price = 95.00, taxable = true
WHERE LOWER(name) LIKE '%vip%';

-- Cat condos
UPDATE "resources" 
SET type = 'CAT_CONDO', price = 35.00, taxable = true
WHERE LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%condo%' OR LOWER(name) LIKE '%feline%';

-- Day camp
UPDATE "resources" 
SET type = 'DAY_CAMP_HALF', price = 25.00, taxable = true
WHERE LOWER(name) LIKE '%day%camp%' AND LOWER(name) LIKE '%half%';

UPDATE "resources" 
SET type = 'DAY_CAMP_FULL', price = 40.00, taxable = true
WHERE LOWER(name) LIKE '%day%camp%' AND LOWER(name) NOT LIKE '%half%';

-- Show results
SELECT name, type, price, "tenantId" FROM "resources" ORDER BY name;
