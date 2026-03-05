-- Add profilePhoto column to staff table
-- Non-destructive: adds nullable column, safe to run on existing data
-- No data loss, no breaking changes

BEGIN;

-- Add profilePhoto column (nullable, no default)
-- This allows existing staff records to remain unchanged
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "profilePhoto" TEXT;

-- Create index for efficient photo lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS "staff_profile_photo_idx" ON "staff"("profilePhoto") WHERE "profilePhoto" IS NOT NULL;

COMMIT;
