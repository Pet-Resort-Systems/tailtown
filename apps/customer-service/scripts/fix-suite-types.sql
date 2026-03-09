-- Fix Resource types for existing suites
UPDATE "Resource" SET type = 'VIP_SUITE' WHERE type = 'SUITE' AND (attributes->>'suiteType' = 'VIP' OR attributes->>'suiteType' LIKE '%VIP%');
UPDATE "Resource" SET type = 'STANDARD_PLUS_SUITE' WHERE type = 'SUITE' AND (attributes->>'suiteType' = 'STANDARD_PLUS' OR attributes->>'suiteType' LIKE '%STANDARD_PLUS%');
UPDATE "Resource" SET type = 'STANDARD_SUITE' WHERE type = 'SUITE' AND (attributes->>'suiteType' = 'STANDARD' OR attributes->>'suiteType' LIKE '%STANDARD%');
