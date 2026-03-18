#!/usr/bin/env node

/**
 * Create Veterinarians Migration Script
 *
 * Generates SQL migration to import veterinarians from Gingr data
 */

const fs = require('fs');
const path = require('path');

console.log('\n🏥 Creating Veterinarians Migration\n');

// Load vets data
const vetsPath = path.join(
  __dirname,
  '..',
  'data',
  'gingr-reference',
  'vets.json'
);
const vets = JSON.parse(fs.readFileSync(vetsPath, 'utf8'));

console.log(`Found ${vets.length} veterinarians to import\n`);

// Filter out invalid/placeholder vets
const validVets = vets.filter((vet) => {
  const name = (vet.name || vet.label || '').trim();
  // Skip empty names, single characters, or obvious placeholders
  return (
    name.length > 1 &&
    name !== '!' &&
    name !== '?' &&
    name !== '-' &&
    name !== 'N/A' &&
    name !== 'NA' &&
    !name.match(/^[^a-zA-Z]+$/)
  ); // Skip names with no letters
});

console.log(`Valid veterinarians: ${validVets.length}`);
console.log(`Filtered out: ${vets.length - validVets.length}\n`);

// Generate SQL migration
const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
const migrationName = `${timestamp}_add_veterinarians`;
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
let sql = `-- Add Veterinarians Migration
-- Generated from Gingr reference data
-- Total veterinarians: ${validVets.length}

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

-- Insert veterinarians
`;

// Add vets in batches
const batchSize = 50;
let insertCount = 0;

for (let i = 0; i < validVets.length; i += batchSize) {
  const batch = validVets.slice(i, i + batchSize);

  sql += `\n-- Batch ${Math.floor(i / batchSize) + 1} (${batch.length} vets)\n`;
  sql +=
    'INSERT INTO veterinarians (name, phone, fax, email, "address1", "address2", city, state, zip, notes, "gingrId", "locationId", "tenantId", "isActive") VALUES\n';

  batch.forEach((vet, index) => {
    // Escape single quotes and handle nulls
    const escape = (str) => {
      if (!str || str.trim() === '') return 'NULL';
      return `'${String(str).replace(/'/g, "''").trim()}'`;
    };

    const name = escape(vet.name || vet.label);
    const phone = escape(vet.phone_number || vet.phone);
    const fax = escape(vet.fax_number || vet.fax);
    const email = escape(vet.email);
    const address1 = escape(vet.address_1 || vet.address);
    const address2 = escape(vet.address_2);
    const city = escape(vet.city);
    const state = escape(vet.state);
    const zip = escape(vet.zip);
    const notes = escape(vet.notes);
    const gingrId = escape(vet.id || vet.value);
    const locationId = escape(vet.location_id);
    const isActive =
      vet.status === '1' || vet.status === 1 || vet.isActive ? 'true' : 'true'; // Default to active

    sql += `  (${name}, ${phone}, ${fax}, ${email}, ${address1}, ${address2}, ${city}, ${state}, ${zip}, ${notes}, ${gingrId}, ${locationId}, 'dev', ${isActive})`;

    if (index < batch.length - 1) {
      sql += ',\n';
    } else {
      sql += '\n';
    }

    insertCount++;
  });

  sql += 'ON CONFLICT (name, phone, "tenantId") DO NOTHING;\n';
}

sql += `\n-- Total veterinarians inserted: ${insertCount}\n`;

// Write migration file
const migrationFile = path.join(migrationPath, 'migration.sql');
fs.writeFileSync(migrationFile, sql);

console.log(`✅ Migration created: ${migrationName}`);
console.log(`📁 Location: ${migrationFile}`);
console.log(`\n📊 Summary:`);
console.log(`   Total veterinarians: ${insertCount}`);
console.log(
  `   With phone numbers: ${validVets.filter((v) => v.phone_number || v.phone).length}`
);
console.log(
  `   With addresses: ${validVets.filter((v) => v.city && v.city.trim()).length}`
);
console.log(`   With email: ${validVets.filter((v) => v.email).length}`);

// Show sample vets
console.log(`\n📋 Sample Veterinarians:`);
validVets.slice(0, 5).forEach((vet) => {
  const name = vet.name || vet.label;
  const phone = vet.phone_number || vet.phone || 'No phone';
  const city = vet.city || 'No city';
  console.log(`   • ${name} - ${phone} - ${city}`);
});

console.log(`\n🚀 Next Steps:`);
console.log(`   1. Review the migration file`);
console.log(`   2. Run: node scripts/run-vets-migration.js`);
console.log('');
