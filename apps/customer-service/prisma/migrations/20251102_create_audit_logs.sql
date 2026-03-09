-- Create audit_logs table
-- Phase 1: Super Admin Authentication

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID REFERENCES super_admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  tenant_id VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail of all super admin actions for security and compliance';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: LOGIN, LOGOUT, CREATE_TENANT, DELETE_TENANT, IMPERSONATE, etc.';
COMMENT ON COLUMN audit_logs.details IS 'Additional context about the action in JSON format';
