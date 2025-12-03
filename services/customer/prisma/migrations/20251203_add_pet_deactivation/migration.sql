-- Add deactivation fields to pets table
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "deactivationReason" TEXT;
