-- Add maxPets field to resources table for multi-pet suite capacity
-- Migration: add_max_pets_to_resources
-- Date: 2025-11-20

-- Add the maxPets column with default value of 1
ALTER TABLE resources ADD COLUMN IF NOT EXISTS "maxPets" INTEGER DEFAULT 1;

-- Set capacity based on suite type
-- STANDARD_SUITE: 1 pet
UPDATE resources SET "maxPets" = 1 WHERE type = 'STANDARD_SUITE';

-- STANDARD_PLUS_SUITE: 2 pets (family suite)
UPDATE resources SET "maxPets" = 2 WHERE type = 'STANDARD_PLUS_SUITE';

-- VIP_SUITE: 3 pets (large family suite)
UPDATE resources SET "maxPets" = 3 WHERE type = 'VIP_SUITE';

-- All other types default to 1
UPDATE resources SET "maxPets" = 1 WHERE "maxPets" IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE resources ALTER COLUMN "maxPets" SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN resources."maxPets" IS 'Maximum number of pets allowed in this resource/suite';
