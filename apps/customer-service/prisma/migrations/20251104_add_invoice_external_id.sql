-- Add externalId to invoices for Gingr sync tracking
-- Safe migration - adds column without data loss

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
COMMENT ON COLUMN invoices.external_id IS 'ID from external system (Gingr, etc.) for migration tracking';

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_invoices_external_id ON invoices(external_id);
