-- AddColumn - Add externalId field to track records from external systems (Gingr, etc.)
-- This helps prevent duplicate imports and maintain relationships during migration
-- These fields are optional and will not affect existing records

-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "pets" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_external_id_idx" ON "customers"("externalId");
CREATE INDEX IF NOT EXISTS "pets_external_id_idx" ON "pets"("externalId");
CREATE INDEX IF NOT EXISTS "services_external_id_idx" ON "services"("externalId");
CREATE INDEX IF NOT EXISTS "reservations_external_id_idx" ON "reservations"("externalId");
CREATE INDEX IF NOT EXISTS "invoices_external_id_idx" ON "invoices"("externalId");

-- Add comments for documentation
COMMENT ON COLUMN "customers"."externalId" IS 'ID from external system (Gingr, etc.) for migration tracking and duplicate prevention';
COMMENT ON COLUMN "pets"."externalId" IS 'ID from external system (Gingr, etc.) for migration tracking and duplicate prevention';
COMMENT ON COLUMN "services"."externalId" IS 'ID from external system (Gingr, etc.) for migration tracking and duplicate prevention';
COMMENT ON COLUMN "reservations"."externalId" IS 'ID from external system (Gingr, etc.) for migration tracking and duplicate prevention';
COMMENT ON COLUMN "invoices"."externalId" IS 'ID from external system (Gingr, etc.) for migration tracking and duplicate prevention';
