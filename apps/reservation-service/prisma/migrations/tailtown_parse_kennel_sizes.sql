-- Tailtown-specific migration: Parse kennel names and set room sizes
-- This migration is specific to Tailtown Pet Resort and should NOT be run on other tenants
-- Date: 2025-11-20

-- Parse kennel names and set size based on last letter suffix
-- A03R = Room A, Kennel 03, Regular (Junior Suite)
-- B25Q = Room B, Kennel 25, Queen Suite
-- B27K = Room B, Kennel 27, King Suite

UPDATE resources 
SET "size" = CASE 
  WHEN name ~ '[Rr]$' THEN 'JUNIOR'::"RoomSize"   -- Ends with R (Regular/Junior)
  WHEN name ~ '[Qq]$' THEN 'QUEEN'::"RoomSize"    -- Ends with Q (Queen)
  WHEN name ~ '[Kk]$' THEN 'KING'::"RoomSize"     -- Ends with K (King)
  WHEN name ~ '[Vv]$' THEN 'VIP'::"RoomSize"      -- Ends with V (VIP)
  WHEN name ~ '[Cc]$' THEN 'CAT'::"RoomSize"      -- Ends with C (Cat)
  WHEN name ~ '[Oo]$' THEN 'OVERFLOW'::"RoomSize" -- Ends with O (Overflow)
  ELSE 'JUNIOR'::"RoomSize"                       -- Default to JUNIOR
END
WHERE type IN ('STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE', 'KENNEL', 'SUITE')
  AND "tenantId" = 'dev';

-- Update maxPets based on room size
UPDATE resources 
SET "maxPets" = CASE "size"
  WHEN 'JUNIOR' THEN 1
  WHEN 'QUEEN' THEN 2
  WHEN 'KING' THEN 4
  WHEN 'VIP' THEN 4
  WHEN 'CAT' THEN 2
  WHEN 'OVERFLOW' THEN 2
  ELSE 1
END
WHERE "size" IS NOT NULL
  AND "tenantId" = 'dev';

-- Consolidate old suite types to just 'KENNEL'
UPDATE resources 
SET type = 'KENNEL'
WHERE type IN ('STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE', 'SUITE')
  AND "tenantId" = 'dev';

-- Verification query (run separately to check results)
-- SELECT "size", type, "maxPets", COUNT(*) as count, 
--        STRING_AGG(name, ', ' ORDER BY name LIMIT 5) as sample_names
-- FROM resources 
-- WHERE "tenantId" = 'dev' AND type = 'KENNEL'
-- GROUP BY "size", type, "maxPets"
-- ORDER BY "size";
