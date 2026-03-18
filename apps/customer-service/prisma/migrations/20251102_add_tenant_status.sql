-- Add tenant status management fields
-- Phase 2: Tenant Management

-- Add status column
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- Add suspension tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES super_admins(id);

-- Add soft delete tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES super_admins(id);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Comments
COMMENT ON COLUMN tenants.status IS 'ACTIVE, SUSPENDED, INACTIVE, DELETED';
COMMENT ON COLUMN tenants.suspended_at IS 'When the tenant was suspended';
COMMENT ON COLUMN tenants.suspended_reason IS 'Reason for suspension';
COMMENT ON COLUMN tenants.suspended_by IS 'Super admin who suspended the tenant';
COMMENT ON COLUMN tenants.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN tenants.deleted_by IS 'Super admin who deleted the tenant';
