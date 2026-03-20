#!/usr/bin/env node

/**
 * Create Temperaments Migration Script
 *
 * Generates SQL migration to add temperaments from Gingr data
 */

const fs = require('fs');
const path = require('path');

console.log('\n😊 Creating Temperaments Migration\n');

// Load temperaments data
const temperamentsPath = path.join(
  __dirname,
  '..',
  'data',
  'gingr-reference',
  'temperaments.json'
);
const temperaments = JSON.parse(fs.readFileSync(temperamentsPath, 'utf8'));

console.log(`Found ${temperaments.length} temperament types\n`);

// Generate SQL migration
const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
const migrationName = `${timestamp}_add_temperaments`;
const migrationPath = path.join(
  __dirname,
  '..',
  'services',
  'customer',
  'prisma',
  'migrations',
  migrationName
);

// Create migration directory
if (!fs.existsSync(migrationPath)) {
  fs.mkdirSync(migrationPath, { recursive: true });
}

// Generate SQL
let sql = `-- Add Temperaments Migration
-- Generated from Gingr reference data
-- Total temperament types: ${temperaments.length}

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
`;

temperaments.forEach((temp, index) => {
  const name = temp.label.replace(/'/g, "''");
  const gingrId = temp.value;

  sql += `  ('${name}', '${gingrId}', 'dev')`;

  if (index < temperaments.length - 1) {
    sql += ',\n';
  } else {
    sql += '\n';
  }
});

sql += `ON CONFLICT (name, "tenantId") DO NOTHING;

-- Total temperament types inserted: ${temperaments.length}
`;

// Write migration file
const migrationFile = path.join(migrationPath, 'migration.sql');
fs.writeFileSync(migrationFile, sql);

console.log(`✅ Migration created: ${migrationName}`);
console.log(`📁 Location: ${migrationFile}`);
console.log(`\n📊 Temperament Types:`);
temperaments.forEach((temp) => {
  console.log(`   • ${temp.label}`);
});

console.log(`\n🚀 Next Steps:`);
console.log(`   1. Review the migration file`);
console.log(`   2. Run: node scripts/run-temperaments-migration.js`);
console.log('');
