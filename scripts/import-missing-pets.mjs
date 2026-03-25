/**
 * Import Missing Pets from Gingr
 * Fetches all pets from Gingr and imports only those not already in database
 */

import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

const GINGR_CONFIG = {
  subdomain: 'tailtownpetresort',
  apiKey: 'c84c09ecfacdf23a495505d2ae1df533',
  baseUrl: 'https://tailtownpetresort.gingrapp.com/api/v1'
};

const TENANT_ID = 'dev';

// Fetch all animals from Gingr
async function fetchGingrAnimals() {
  const formData = new URLSearchParams();
  formData.append('key', GINGR_CONFIG.apiKey);

  console.log('Fetching all animals from Gingr...');
  
  const response = await fetch(`${GINGR_CONFIG.baseUrl}/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Gingr API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.data && typeof data.data === 'object') {
    return Object.values(data.data);
  }
  
  return [];
}

// Get existing pet external IDs
async function getExistingPetIds() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT \\"externalId\\" FROM pets WHERE \\"externalId\\" IS NOT NULL;"`
  );
  
  const ids = new Set();
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    const id = line.trim();
    if (id) {
      ids.add(id);
    }
  }
  
  console.log(`Found ${ids.size} existing pets in database`);
  return ids;
}

// Get customer map
async function getCustomerMap() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT \\"externalId\\", id FROM customers WHERE \\"externalId\\" IS NOT NULL;"`
  );
  
  const map = new Map();
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    const [externalId, id] = line.trim().split('|').map(s => s.trim());
    if (externalId && id) {
      map.set(externalId, id);
    }
  }
  
  console.log(`Loaded ${map.size} customer mappings`);
  return map;
}

// Escape SQL strings
function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

// Convert Gingr animal to SQL INSERT
function animalToSql(animal, customerMap) {
  const customerId = customerMap.get(animal.owner_id);
  
  if (!customerId) {
    return null; // Skip if customer not found
  }
  
  // Skip pets without names
  if (!animal.first_name || animal.first_name.trim() === '') {
    return null;
  }
  
  // Map species_id to PetType enum (DOG, CAT, OTHER)
  let petType = 'OTHER';
  if (animal.species_id) {
    const species = animal.species_id.toLowerCase();
    if (species.includes('dog') || species === '1') petType = 'DOG';
    else if (species.includes('cat') || species === '2') petType = 'CAT';
  }
  
  // Parse gender to Gender enum (MALE, FEMALE, UNKNOWN)
  let gender = 'UNKNOWN';
  if (animal.gender) {
    const g = animal.gender.toLowerCase();
    if (g.includes('male') && !g.includes('female')) gender = 'MALE';
    else if (g.includes('female')) gender = 'FEMALE';
  }
  
  // Parse birthday (Unix timestamp to ISO date)
  let birthDate = 'NULL';
  if (animal.birthday && !isNaN(animal.birthday)) {
    const date = new Date(animal.birthday * 1000);
    birthDate = `'${date.toISOString()}'`;
  }
  
  // Parse weight
  let weight = 'NULL';
  if (animal.weight && !isNaN(parseFloat(animal.weight))) {
    weight = parseFloat(animal.weight);
  }
  
  // Parse boolean flags
  const isNeutered = animal.fixed === '1' || animal.fixed === 1;
  
  // Build petIcons JSON based on flags
  const icons = [];
  if (animal.vip === '1' || animal.vip === 1) icons.push({icon: 'vip', label: 'VIP'});
  if (animal.banned === '1' || animal.banned === 1) icons.push({icon: 'red-flag', label: 'Banned'});
  if (animal.medicines) icons.push({icon: 'medication-required', label: 'Medications'});
  if (animal.allergies) icons.push({icon: 'allergies', label: 'Allergies'});
  if (animal.temperment && animal.temperment.toLowerCase().includes('aggressive')) {
    icons.push({icon: 'behavioral-note', label: 'Behavioral Note'});
  }
  
  const petIconsJson = icons.length > 0 ? escapeSql(JSON.stringify(icons)) : 'NULL';
  
  return `(
    gen_random_uuid(),
    ${escapeSql(animal.first_name)},
    '${petType}',
    ${escapeSql(animal.breed_id)},
    ${escapeSql(animal.color)},
    ${birthDate},
    ${weight},
    '${gender}',
    ${isNeutered},
    ${escapeSql(animal.microchip)},
    NULL,
    ${escapeSql(animal.notes)},
    ${escapeSql(animal.feeding_notes)},
    ${escapeSql(animal.medicines)},
    ${escapeSql(animal.temperment)},
    ${escapeSql(animal.allergies)},
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    NULL,
    NOW(),
    NOW(),
    '${customerId}',
    '${TENANT_ID}',
    NULL,
    ${petIconsJson},
    '${animal.id}',
    NULL,
    ${escapeSql(animal.vet_id)}
  )`;
}

async function importMissingPets() {
  try {
    console.log('Starting missing pets import...\n');

    // Load data
    console.log('Loading existing data...');
    const [animals, existingPetIds, customerMap] = await Promise.all([
      fetchGingrAnimals(),
      getExistingPetIds(),
      getCustomerMap()
    ]);
    
    console.log(`Fetched ${animals.length} animals from Gingr\n`);

    // Filter to only missing pets
    const missingPets = animals.filter(animal => !existingPetIds.has(animal.id));
    console.log(`Found ${missingPets.length} missing pets to import\n`);

    if (missingPets.length === 0) {
      console.log('No missing pets to import');
      return;
    }

    // Convert to SQL
    console.log('Converting pets to SQL...');
    const sqlValues = [];
    let skipped = 0;
    
    for (const animal of missingPets) {
      const sql = animalToSql(animal, customerMap);
      if (sql) {
        sqlValues.push(sql);
      } else {
        skipped++;
      }
    }
    
    console.log(`Converted ${sqlValues.length} pets (skipped ${skipped} due to missing customer)\n`);

    if (sqlValues.length === 0) {
      console.log('No pets to import after filtering');
      return;
    }

    // Generate SQL file
    const sqlFile = '/tmp/gingr-missing-pets-import.sql';
    const sqlContent = `
-- Import Missing Gingr Pets
-- Generated: ${new Date().toISOString()}

-- Add unique constraint if it doesn't exist
ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_external_id_unique;
ALTER TABLE pets ADD CONSTRAINT pets_external_id_unique UNIQUE ("externalId");

INSERT INTO pets (
  id, name, type, breed, color, birthdate, weight, gender, "isNeutered",
  "microchipNumber", "rabiesTagNumber", "specialNeeds", "foodNotes",
  "medicationNotes", "behaviorNotes", allergies, "idealPlayGroup",
  "vaccinationStatus", "vaccineExpirations", "vetName", "vetPhone",
  "profilePhoto", "isActive", "lastCheckIn", "createdAt", "updatedAt",
  "customerId", "tenantId", "iconNotes", "petIcons", "externalId",
  "vaccineRecordFiles", "veterinarianId"
) VALUES
${sqlValues.join(',\n')}
ON CONFLICT ("externalId") DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  breed = EXCLUDED.breed,
  color = EXCLUDED.color,
  birthdate = EXCLUDED.birthdate,
  weight = EXCLUDED.weight,
  gender = EXCLUDED.gender,
  "isNeutered" = EXCLUDED."isNeutered",
  "microchipNumber" = EXCLUDED."microchipNumber",
  "medicationNotes" = EXCLUDED."medicationNotes",
  allergies = EXCLUDED.allergies,
  "specialNeeds" = EXCLUDED."specialNeeds",
  "foodNotes" = EXCLUDED."foodNotes",
  "behaviorNotes" = EXCLUDED."behaviorNotes",
  "petIcons" = EXCLUDED."petIcons",
  "updatedAt" = NOW();
`;

    // Write SQL file
    await new Promise((resolve, reject) => {
      const stream = createWriteStream(sqlFile);
      stream.write(sqlContent);
      stream.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`SQL file generated: ${sqlFile}`);
    console.log('Importing into database...\n');

    // Execute SQL
    const { stdout, stderr } = await execAsync(
      `docker exec -i tailtown-postgres psql -U postgres -d customer < ${sqlFile}`
    );
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.error('Import errors:', stderr);
    }
    
    console.log(stdout);
    console.log('\n✅ Import complete!');
    
    // Verify
    const { stdout: count } = await execAsync(
      `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT COUNT(*) FROM pets;"`
    );
    
    console.log(`\nTotal pets in database: ${count.trim()}`);
    
  } catch (error) {
    console.error('Import failed:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    process.exit(1);
  }
}

// Run the import
importMissingPets();
