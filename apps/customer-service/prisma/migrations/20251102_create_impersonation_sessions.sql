-- Create impersonation_sessions table
-- Phase 3: Tenant Impersonation

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  tenant_id VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_impersonation_super_admin ON impersonation_sessions(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_tenant ON impersonation_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_impersonation_started ON impersonation_sessions(started_at DESC);

-- Comments
COMMENT ON TABLE impersonation_sessions IS 'Tracks super admin impersonation sessions for security and audit';
COMMENT ON COLUMN impersonation_sessions.reason IS 'Why the super admin is impersonating this tenant';
COMMENT ON COLUMN impersonation_sessions.expires_at IS 'Session automatically expires after 30 minutes';
COMMENT ON COLUMN impersonation_sessions.ended_at IS 'When the super admin manually ended the session';
