-- Vaccine Requirement Management Migration
-- Adds vaccine requirement configuration table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create vaccine_requirements table
CREATE TABLE IF NOT EXISTS vaccine_requirements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'dev',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Applicability
  pet_type VARCHAR(50),
  service_type VARCHAR(50),
  
  -- Requirements
  is_required BOOLEAN NOT NULL DEFAULT true,
  validity_period_months INTEGER,
  reminder_days_before INTEGER DEFAULT 30,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT vaccine_requirement_unique UNIQUE (tenant_id, name, pet_type, service_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vaccine_requirements_tenant_active 
  ON vaccine_requirements(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_vaccine_requirements_type 
  ON vaccine_requirements(pet_type, service_type);

-- Insert default vaccine requirements for dogs
INSERT INTO vaccine_requirements (tenant_id, name, description, pet_type, service_type, is_required, validity_period_months, display_order)
VALUES 
  ('dev', 'Rabies', 'Required by law for all dogs', 'DOG', NULL, true, 12, 1),
  ('dev', 'DHPP', 'Distemper, Hepatitis, Parvovirus, Parainfluenza', 'DOG', NULL, true, 12, 2),
  ('dev', 'Bordetella', 'Kennel cough vaccine - required for boarding and daycare', 'DOG', 'BOARDING', true, 6, 3),
  ('dev', 'Bordetella', 'Kennel cough vaccine - required for boarding and daycare', 'DOG', 'DAYCARE', true, 6, 3),
  ('dev', 'Canine Influenza', 'Recommended for dogs in group settings', 'DOG', NULL, false, 12, 4)
ON CONFLICT (tenant_id, name, pet_type, service_type) DO NOTHING;

-- Insert default vaccine requirements for cats
INSERT INTO vaccine_requirements (tenant_id, name, description, pet_type, service_type, is_required, validity_period_months, display_order)
VALUES 
  ('dev', 'Rabies', 'Required by law for all cats', 'CAT', NULL, true, 12, 1),
  ('dev', 'FVRCP', 'Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia', 'CAT', NULL, true, 12, 2),
  ('dev', 'FeLV', 'Feline Leukemia - recommended for outdoor cats', 'CAT', NULL, false, 12, 3)
ON CONFLICT (tenant_id, name, pet_type, service_type) DO NOTHING;

COMMENT ON TABLE vaccine_requirements IS 'Configurable vaccine requirements per tenant, pet type, and service type';
COMMENT ON COLUMN vaccine_requirements.pet_type IS 'NULL = applies to all pet types, or specific type like DOG, CAT';
COMMENT ON COLUMN vaccine_requirements.service_type IS 'NULL = applies to all services, or specific like BOARDING, DAYCARE, GROOMING';
COMMENT ON COLUMN vaccine_requirements.validity_period_months IS 'How many months the vaccine is valid for';
COMMENT ON COLUMN vaccine_requirements.reminder_days_before IS 'Days before expiration to send reminder';
