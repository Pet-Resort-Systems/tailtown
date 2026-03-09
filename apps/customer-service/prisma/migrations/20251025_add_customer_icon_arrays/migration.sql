-- Add icon array fields to customers table for multiple labeled icons
-- Similar to pet icons system (VIP, payment issues, special handling, etc.)

-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customerIcons" JSONB;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "iconNotes" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "customers"."customerIcons" IS 'Array of icon IDs for quick visual reference (VIP, payment_issues, special_handling, etc.)';
COMMENT ON COLUMN "customers"."iconNotes" IS 'Custom notes for generic flag icons, keyed by icon ID';
