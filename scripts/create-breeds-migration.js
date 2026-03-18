#!/usr/bin/env node

/**
 * Create Breeds Migration Script
 *
 * Generates SQL migration to import breeds from Gingr data
 */

const fs = require('fs');
const path = require('path');

console.log('\n🐕 Creating Breeds Migration\n');

// Load breeds data
const breedsPath = path.join(
  __dirname,
  '..',
  'data',
  'gingr-reference',
  'breeds.json'
);
const breeds = JSON.parse(fs.readFileSync(breedsPath, 'utf8'));

console.log(`Found ${breeds.length} breeds to import\n`);

// Categorize breeds by likely species
function categorizeBreed(breedName) {
  const name = breedName.toLowerCase();

  // Cat breeds
  const catBreeds = [
    'abyssinian',
    'bengal',
    'birman',
    'bombay',
    'burmese',
    'chartreux',
    'himalayan',
    'maine coon',
    'manx',
    'persian',
    'ragdoll',
    'russian blue',
    'siamese',
    'sphynx',
    'turkish',
    'exotic shorthair',
    'scottish fold',
    'british shorthair',
    'american shorthair',
    'oriental',
    'tonkinese',
    'balinese',
    'javanese',
    'ocicat',
    'somali',
    'korat',
    'singapura',
  ];

  // Check if it's a cat breed
  for (const catBreed of catBreeds) {
    if (name.includes(catBreed)) {
      return 'CAT';
    }
  }

  // Check for explicit cat/dog indicators
  if (
    name.includes('cat') ||
    name.includes('feline') ||
    name.includes('kitten')
  ) {
    return 'CAT';
  }

  if (
    name.includes('dog') ||
    name.includes('canine') ||
    name.includes('puppy') ||
    name.includes('terrier') ||
    name.includes('hound') ||
    name.includes('retriever') ||
    name.includes('spaniel') ||
    name.includes('shepherd') ||
    name.includes('poodle') ||
    name.includes('bulldog') ||
    name.includes('collie') ||
    name.includes('setter')
  ) {
    return 'DOG';
  }

  // Default to DOG for most breeds
  return 'DOG';
}

// Group breeds by species
const breedsBySpecies = {
  DOG: [],
  CAT: [],
  OTHER: [],
};

breeds.forEach((breed) => {
  const species = categorizeBreed(breed.label);
  breedsBySpecies[species].push(breed.label);
});

console.log('Breed Distribution:');
console.log(`  Dogs: ${breedsBySpecies.DOG.length}`);
console.log(`  Cats: ${breedsBySpecies.CAT.length}`);
console.log(`  Other: ${breedsBySpecies.OTHER.length}\n`);

// Generate SQL migration
const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
const migrationName = `${timestamp}_add_breeds`;
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
let sql = `-- Add Breeds Migration
-- Generated from Gingr reference data
-- Total breeds: ${breeds.length}

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

-- Insert breeds
`;

// Add breeds in batches
const batchSize = 100;
let insertCount = 0;

Object.entries(breedsBySpecies).forEach(([species, breedNames]) => {
  if (breedNames.length === 0) return;

  sql += `\n-- ${species} breeds (${breedNames.length})\n`;

  for (let i = 0; i < breedNames.length; i += batchSize) {
    const batch = breedNames.slice(i, i + batchSize);

    sql += 'INSERT INTO breeds (name, species, "gingrId", "tenantId") VALUES\n';

    batch.forEach((breedName, index) => {
      // Find the original breed object to get the Gingr ID
      const breedObj = breeds.find((b) => b.label === breedName);
      const gingrId = breedObj ? breedObj.value : null;

      // Escape single quotes
      const escapedName = breedName.replace(/'/g, "''");

      sql += `  ('${escapedName}', '${species}', ${gingrId ? `'${gingrId}'` : 'NULL'}, 'dev')`;

      if (index < batch.length - 1) {
        sql += ',\n';
      } else {
        sql += '\n';
      }

      insertCount++;
    });

    sql += 'ON CONFLICT (name, species, "tenantId") DO NOTHING;\n\n';
  }
});

sql += `-- Total breeds inserted: ${insertCount}\n`;

// Write migration file
const migrationFile = path.join(migrationPath, 'migration.sql');
fs.writeFileSync(migrationFile, sql);

console.log(`✅ Migration created: ${migrationName}`);
console.log(`📁 Location: ${migrationFile}`);
console.log(`\n📊 Summary:`);
console.log(`   Total breeds: ${insertCount}`);
console.log(`   Dog breeds: ${breedsBySpecies.DOG.length}`);
console.log(`   Cat breeds: ${breedsBySpecies.CAT.length}`);
console.log(`   Other breeds: ${breedsBySpecies.OTHER.length}`);

console.log(`\n🚀 Next Steps:`);
console.log(`   1. Review the migration file`);
console.log(`   2. Run: pnpm exec prisma migrate dev --name add_breeds`);
console.log(
  `   3. Or run SQL directly: psql -U postgres -d tailtown -f "${migrationFile}"`
);
console.log('');
