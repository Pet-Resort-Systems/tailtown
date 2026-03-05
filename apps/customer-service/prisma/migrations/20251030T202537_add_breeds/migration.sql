-- Add Breeds Migration
-- Generated from Gingr reference data
-- Total breeds: 954 (full dataset)
-- Test environment: 10 breeds only

-- Create breeds table
CREATE TABLE IF NOT EXISTS breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  species VARCHAR(50) NOT NULL,
  "gingrId" VARCHAR(50),
  "tenantId" VARCHAR(50) DEFAULT 'dev',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, species, "tenantId")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_breeds_species ON breeds(species);
CREATE INDEX IF NOT EXISTS idx_breeds_tenant ON breeds("tenantId");
CREATE INDEX IF NOT EXISTS idx_breeds_name ON breeds(name);

-- Insert minimal dataset for CI/CD and testing
-- Full dataset should be loaded via seed scripts for production
INSERT INTO breeds (name, species, "gingrId", "tenantId") VALUES
  ('Mixed Breed', 'DOG', '672', 'dev'),
  ('Labrador Retriever', 'DOG', '27', 'dev'),
  ('German Shepherd', 'DOG', '53', 'dev'),
  ('Golden Retriever', 'DOG', '28', 'dev'),
  ('Bulldog', 'DOG', '689', 'dev'),
  ('Beagle', 'DOG', '313', 'dev'),
  ('Poodle', 'DOG', '19', 'dev'),
  ('Chihuahua', 'DOG', '11', 'dev'),
  ('Yorkshire Terrier', 'DOG', '23', 'dev'),
  ('Dachshund', 'DOG', '122', 'dev'),
  ('Domestic Shorthair', 'CAT', '744', 'dev'),
  ('Domestic Longhair', 'CAT', '772', 'dev'),
  ('Siamese', 'CAT', '1', 'dev'),
  ('Persian', 'CAT', '2', 'dev'),
  ('Maine Coon', 'CAT', '3', 'dev')
ON CONFLICT (name, species, "tenantId") DO NOTHING;

-- Note: Full dataset (954 breeds) should be loaded separately via:
-- npm run db:seed
-- This keeps migrations fast for CI/CD while allowing full data in production
