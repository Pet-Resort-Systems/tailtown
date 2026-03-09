-- Add taxable field to services table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'services'
  ) THEN
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "taxable" BOOLEAN NOT NULL DEFAULT true;
    COMMENT ON COLUMN "services"."taxable" IS 'Whether this service is subject to sales tax';
  END IF;
END $$;

-- Add taxable field to addon_services table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'addon_services'
  ) THEN
    ALTER TABLE "addon_services" ADD COLUMN IF NOT EXISTS "taxable" BOOLEAN NOT NULL DEFAULT true;
    COMMENT ON COLUMN "addon_services"."taxable" IS 'Whether this add-on service is subject to sales tax';
  END IF;
END $$;
