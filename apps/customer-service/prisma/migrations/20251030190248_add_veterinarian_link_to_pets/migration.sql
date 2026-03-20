-- Add veterinarianId to pets table
-- Safe migration that won't delete existing data

-- Add veterinarianId column
ALTER TABLE pets ADD COLUMN IF NOT EXISTS "veterinarianId" TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS pets_veterinarian_id_idx ON pets("veterinarianId");

-- Try to match existing pets to veterinarians based on vetName
-- Only runs if veterinarians table exists
DO $$
BEGIN
  -- Check if veterinarians table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'veterinarians'
  ) THEN
    -- Try to match existing pets to veterinarians
    -- This is a best-effort match - only updates where there's an exact name match
    UPDATE pets 
    SET "veterinarianId" = v.id
    FROM veterinarians v
    WHERE pets."vetName" IS NOT NULL 
      AND pets."veterinarianId" IS NULL
      AND (
        -- Exact match (case-insensitive, trimmed)
        LOWER(TRIM(pets."vetName")) = LOWER(TRIM(v.name))
        OR
        -- Match with common variations (removing special characters)
        REGEXP_REPLACE(LOWER(TRIM(pets."vetName")), '[^a-z0-9]', '', 'g') = 
        REGEXP_REPLACE(LOWER(TRIM(v.name)), '[^a-z0-9]', '', 'g')
      )
      AND pets."tenantId" = v."tenantId";
    
    -- Log how many were matched
    RAISE NOTICE 'Matched % pets to veterinarians', (
      SELECT COUNT(*) FROM pets WHERE "veterinarianId" IS NOT NULL
    );
  ELSE
    RAISE NOTICE 'Veterinarians table does not exist yet - skipping matching';
  END IF;
END $$;
