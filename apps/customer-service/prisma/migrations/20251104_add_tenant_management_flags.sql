-- Add tenant management flags for production protection, templates, and Gingr sync
-- Safe migration - adds columns without data loss

-- Add production protection flag
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_production BOOLEAN DEFAULT false;
COMMENT ON COLUMN tenants.is_production IS 'Protect from resets/deletes - for real business data';

-- Add template flag for cloning
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
COMMENT ON COLUMN tenants.is_template IS 'Can be cloned to create new tenant accounts';

-- Add Gingr sync flags
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gingr_sync_enabled BOOLEAN DEFAULT false;
COMMENT ON COLUMN tenants.gingr_sync_enabled IS 'Enable automatic Gingr data synchronization';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_gingr_sync_at TIMESTAMP;
COMMENT ON COLUMN tenants.last_gingr_sync_at IS 'Last successful Gingr sync timestamp';

-- Add cloning tracking (without foreign key constraint for now - will add later if needed)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cloned_from_id UUID;
COMMENT ON COLUMN tenants.cloned_from_id IS 'Source tenant ID if this was cloned from a template';

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tenants_is_production ON tenants(is_production);
CREATE INDEX IF NOT EXISTS idx_tenants_is_template ON tenants(is_template);
CREATE INDEX IF NOT EXISTS idx_tenants_gingr_sync ON tenants(gingr_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_tenants_cloned_from ON tenants(cloned_from_id);

-- Set existing 'tailtown' tenant as production (if it exists)
UPDATE tenants 
SET is_production = true, 
    gingr_sync_enabled = true
WHERE subdomain = 'tailtown';

COMMENT ON TABLE tenants IS 'Multi-tenant accounts with production protection and template cloning support';
