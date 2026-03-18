-- Add notes field to pets table for general Gingr animal notes
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Add comment
COMMENT ON COLUMN "pets"."notes" IS 'General notes from Gingr animal.notes field';
