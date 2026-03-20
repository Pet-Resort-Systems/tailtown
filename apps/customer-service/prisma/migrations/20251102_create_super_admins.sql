-- Create super_admins table
-- Phase 1: Super Admin Authentication

CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'SUPER_ADMIN',
  is_active BOOLEAN DEFAULT true,
  require_2fa BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON super_admins(is_active);
CREATE INDEX IF NOT EXISTS idx_super_admins_role ON super_admins(role);

-- Comments for documentation
COMMENT ON TABLE super_admins IS 'Super administrator accounts with elevated privileges for platform management';
COMMENT ON COLUMN super_admins.role IS 'SUPER_ADMIN, SUPPORT, or DEVELOPER';
COMMENT ON COLUMN super_admins.require_2fa IS 'Whether 2FA is required for this account (future feature)';
