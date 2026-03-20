-- Add Temperaments Migration
-- Generated from Gingr reference data
-- Total temperament types: 5

-- Add temperament column to pets table if it doesn't exist
ALTER TABLE pets ADD COLUMN IF NOT EXISTS temperament VARCHAR(50);

-- Create pet_temperaments table for multiple temperament selections
CREATE TABLE IF NOT EXISTS pet_temperaments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "petId" TEXT NOT NULL,
  temperament VARCHAR(50) NOT NULL,
  "tenantId" TEXT DEFAULT 'dev',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_pet_temperaments_pet FOREIGN KEY ("petId") REFERENCES pets(id) ON DELETE CASCADE,
  UNIQUE("petId", temperament, "tenantId")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pet_temperaments_pet ON pet_temperaments("petId");
CREATE INDEX IF NOT EXISTS idx_pet_temperaments_tenant ON pet_temperaments("tenantId");

-- Create temperament_types reference table
CREATE TABLE IF NOT EXISTS temperament_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  "gingrId" VARCHAR(50),
  "tenantId" VARCHAR(50) DEFAULT 'dev',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, "tenantId")
);

-- Insert temperament types
INSERT INTO temperament_types (name, "gingrId", "tenantId") VALUES
  ('Aggressive', '3', 'dev'),
  ('Calm', '4', 'dev'),
  ('Mean', '5', 'dev'),
  ('Playful', '1', 'dev'),
  ('Rowdy', '2', 'dev')
ON CONFLICT (name, "tenantId") DO NOTHING;

-- Total temperament types inserted: 5
