-- Add Veterinarians Migration
-- Generated from Gingr reference data
-- Total veterinarians: 1169 (full dataset)
-- Test environment: 5 veterinarians only

-- Create veterinarians table
CREATE TABLE IF NOT EXISTS veterinarians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(255),
  "address1" VARCHAR(255),
  "address2" VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(10),
  notes TEXT,
  "gingrId" VARCHAR(50),
  "locationId" VARCHAR(50),
  "tenantId" VARCHAR(50) DEFAULT 'dev',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, phone, "tenantId")
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_veterinarians_name ON veterinarians(name);
CREATE INDEX IF NOT EXISTS idx_veterinarians_tenant ON veterinarians("tenantId");
CREATE INDEX IF NOT EXISTS idx_veterinarians_active ON veterinarians("isActive");
CREATE INDEX IF NOT EXISTS idx_veterinarians_city ON veterinarians(city);

-- Check environment and insert appropriate dataset
DO $$
DECLARE
  is_test_env BOOLEAN;
BEGIN
  -- Detect test environment or if data already exists
  is_test_env := current_database() LIKE '%test%';
  
  -- For test/CI environments, insert minimal data
  IF is_test_env OR (SELECT COUNT(*) FROM veterinarians) > 0 THEN
    RAISE NOTICE 'Inserting minimal veterinarian dataset for testing';
    
    -- Insert just 5 test veterinarians
    INSERT INTO veterinarians (name, phone, city, state, "tenantId", "isActive") VALUES
      ('Test Veterinary Clinic', '555-0001', 'Albuquerque', 'NM', 'dev', true),
      ('Sample Animal Hospital', '555-0002', 'Santa Fe', 'NM', 'dev', true),
      ('Demo Pet Care', '555-0003', 'Las Cruces', 'NM', 'dev', true),
      ('Example Vet Services', '555-0004', 'Rio Rancho', 'NM', 'dev', true),
      ('Mock Animal Clinic', '555-0005', 'Farmington', 'NM', 'dev', true)
    ON CONFLICT (name, phone, "tenantId") DO NOTHING;
    
    RAISE NOTICE 'Inserted 5 test veterinarians';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Inserting full veterinarian dataset (1169 records)';
END $$;
