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

-- Delete old resources with "Kennel", "Run", "Suite" in name (legacy duplicates)
DELETE FROM "resources" WHERE LOWER(name) LIKE 'kennel %';
DELETE FROM "resources" WHERE LOWER(name) LIKE 'run %';
DELETE FROM "resources" WHERE LOWER(name) LIKE 'suite %';

-- Update resources based on name patterns
-- Naming convention: A01R, B01Q, B11K etc.
-- R suffix = Junior (Indoor Suite) - $45
-- Q suffix = Queen (Indoor Suite) - $55  
-- K suffix = King - $75

-- Junior kennels (names ending in 'R' like A01R, A02R, etc.)
UPDATE "resources" 
SET type = 'JUNIOR_KENNEL', price = 45.00, taxable = true
WHERE name ~ '^[A-Z][0-9]+R$';

-- Queen kennels (names ending in 'Q' like B01Q, C01Q, etc.)
UPDATE "resources" 
SET type = 'QUEEN_KENNEL', price = 55.00, taxable = true
WHERE name ~ '^[A-Z][0-9]+Q$';

-- King kennels (names ending in 'K' like B11K, C11K, etc.)
UPDATE "resources" 
SET type = 'KING_KENNEL', price = 75.00, taxable = true
WHERE name ~ '^[A-Z][0-9]+K$';

-- VIP rooms (if any exist with 'vip' in name)
UPDATE "resources" 
SET type = 'VIP_ROOM', price = 95.00, taxable = true
WHERE LOWER(name) LIKE '%vip%';

-- Cat condos (if any exist)
UPDATE "resources" 
SET type = 'CAT_CONDO', price = 35.00, taxable = true
WHERE LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%condo%' OR LOWER(name) LIKE '%feline%';

-- Day camp (if any exist)
UPDATE "resources" 
SET type = 'DAY_CAMP_HALF', price = 25.00, taxable = true
WHERE LOWER(name) LIKE '%day%camp%' AND LOWER(name) LIKE '%half%';

UPDATE "resources" 
SET type = 'DAY_CAMP_FULL', price = 40.00, taxable = true
WHERE LOWER(name) LIKE '%day%camp%' AND LOWER(name) NOT LIKE '%half%';

-- Show results
SELECT name, type, price FROM "resources" ORDER BY name;
