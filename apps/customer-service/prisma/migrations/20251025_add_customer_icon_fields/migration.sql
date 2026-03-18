-- Add icon fields to customers table for avatar customization
-- These fields are optional and will not affect existing customer records

-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(50);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "iconColor" VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN "customers"."icon" IS 'Customer avatar icon type (person, face, smile, satisfied, happy, mood, tag, emoticon)';
COMMENT ON COLUMN "customers"."iconColor" IS 'Customer avatar color (blue, green, purple, orange, red, teal, pink, indigo, cyan, lime, amber, brown)';
