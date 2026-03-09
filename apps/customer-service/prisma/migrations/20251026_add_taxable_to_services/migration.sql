-- Add taxable field to services table
ALTER TABLE "services" ADD COLUMN "taxable" BOOLEAN NOT NULL DEFAULT true;

-- Add taxable field to addon_services table
ALTER TABLE "addon_services" ADD COLUMN "taxable" BOOLEAN NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN "services"."taxable" IS 'Whether this service is subject to sales tax';
COMMENT ON COLUMN "addon_services"."taxable" IS 'Whether this add-on service is subject to sales tax';
