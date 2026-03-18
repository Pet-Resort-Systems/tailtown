-- Add logo_url column to tenants table
-- Safe migration - only adds new column, does not affect existing data

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;

COMMENT ON COLUMN "tenants"."logo_url" IS 'Custom business logo URL';
