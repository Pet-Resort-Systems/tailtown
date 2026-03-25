/**
 * Import Vaccine Records from Gingr
 * Fetches immunization records for all pets and imports into medical_records table
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

// Fetch immunizations for a specific animal
async function fetchAnimalImmunizations(animalId) {
  const url = `${GINGR_CONFIG.baseUrl}/get_animal_immunizations?key=${GINGR_CONFIG.apiKey}&animal_id=${animalId}`;
  
  const response = await fetch(url, {
    method: 'GET'
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.data || [];
}

// Get pets in batches to avoid memory issues
async function getPetsBatch(offset, limit) {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT id, \\"externalId\\", name FROM pets WHERE \\"externalId\\" IS NOT NULL ORDER BY id LIMIT ${limit} OFFSET ${offset};"`
  );
  
  const pets = [];
  const lines = stdout.trim().split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.trim().split('|').map(s => s.trim());
    if (parts.length >= 3) {
      const [id, externalId, name] = parts;
      if (id && externalId) {
        pets.push({ id, externalId, name });
      }
    }
  }
  
  return pets;
}

// Get total count of pets
async function getTotalPetCount() {
  const { stdout } = await execAsync(
    `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT COUNT(*) FROM pets WHERE \\"externalId\\" IS NOT NULL;"`
  );
  return parseInt(stdout.trim());
}

// Escape SQL strings
function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

// Convert immunization to SQL INSERT
function immunizationToSql(petId, immunization) {
  // Parse expiration date (Unix timestamp)
  let expirationDate = 'NULL';
  if (immunization.expiration_date && !isNaN(immunization.expiration_date)) {
    const date = new Date(immunization.expiration_date * 1000);
    expirationDate = `'${date.toISOString()}'`;
  }
  
  // Use formatted date as record date if available
  let recordDate = 'NOW()';
  if (immunization.formated_expiry_date) {
    recordDate = `'${immunization.formated_expiry_date}'`;
  }
  
  // Use vaccine TYPE as description, not the note
  const description = `${immunization.type} vaccination`;
  const notes = immunization.note || '';
  const recordType = 'VACCINATION';
  
  return `(
    gen_random_uuid(),
    '${petId}',
    '${recordType}',
    ${recordDate},
    ${expirationDate},
    ${escapeSql(description)},
    NULL,
    NULL,
    false,
    NULL,
    NULL,
    NOW(),
    NOW(),
    '${TENANT_ID}'
  )`;
}

async function importVaccineRecords() {
  try {
    console.log('Starting vaccine records import...\n');

    // Get total count
    const totalPets = await getTotalPetCount();
    console.log(`Found ${totalPets} pets to check for vaccines\n`);
    
    if (totalPets === 0) {
      console.log('No pets found to import vaccines for');
      return;
    }

    const BATCH_SIZE = 1000;
    const allSqlValues = [];
    let grandTotalProcessed = 0;
    let grandTotalWithVaccines = 0;
    let grandTotalVaccines = 0;
    let grandTotalErrors = 0;

    // Process in batches of 1000 pets
    for (let offset = 0; offset < totalPets; offset += BATCH_SIZE) {
      console.log(`\n=== Processing batch ${Math.floor(offset/BATCH_SIZE) + 1}/${Math.ceil(totalPets/BATCH_SIZE)} (pets ${offset + 1}-${Math.min(offset + BATCH_SIZE, totalPets)}) ===`);
      
      const pets = await getPetsBatch(offset, BATCH_SIZE);
      console.log(`Loaded ${pets.length} pets in this batch`);
      
      let batchProcessed = 0;
      let batchWithVaccines = 0;
      let batchVaccines = 0;
      let batchErrors = 0;

      // Process each pet in the batch
      for (const pet of pets) {
        try {
          const immunizations = await fetchAnimalImmunizations(pet.externalId);
          batchProcessed++;
          grandTotalProcessed++;
          
          if (immunizations && immunizations.length > 0) {
            batchWithVaccines++;
            grandTotalWithVaccines++;
            batchVaccines += immunizations.length;
            grandTotalVaccines += immunizations.length;
            
            for (const immunization of immunizations) {
              const sql = immunizationToSql(pet.id, immunization);
              allSqlValues.push(sql);
            }
          }
          
          // Rate limiting - wait 50ms between requests
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          batchErrors++;
          grandTotalErrors++;
        }
      }
      
      console.log(`Batch complete: ${batchProcessed} pets, ${batchWithVaccines} with vaccines, ${batchVaccines} records, ${batchErrors} errors`);
      console.log(`Grand total so far: ${grandTotalProcessed}/${totalPets} pets, ${grandTotalVaccines} vaccine records`);
    }
    
    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`Processed ${grandTotalProcessed} pets`);
    console.log(`Found vaccines for ${grandTotalWithVaccines} pets`);
    console.log(`Total vaccine records: ${grandTotalVaccines}`);
    console.log(`Errors: ${grandTotalErrors}\n`);

    if (allSqlValues.length === 0) {
      console.log('No vaccine records to import');
      return;
    }

    // Generate SQL file
    const sqlFile = '/tmp/gingr-vaccine-records-import.sql';
    const sqlContent = `
-- Import Gingr Vaccine Records
-- Generated: ${new Date().toISOString()}

INSERT INTO medical_records (
  id, "petId", "recordType", "recordDate", "expirationDate",
  description, veterinarian, "fileUrl", verified, "verifiedBy",
  "verifiedDate", "createdAt", "updatedAt", "tenantId"
) VALUES
${allSqlValues.join(',\n')}
ON CONFLICT DO NOTHING;
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
      `docker exec tailtown-postgres psql -U postgres -d customer -t -c "SELECT COUNT(*) FROM medical_records;"`
    );
    
    console.log(`\nTotal medical records in database: ${count.trim()}`);
    
  } catch (error) {
    console.error('Import failed:', error.message);
    if (error.stdout) console.error('stdout:', error.stdout);
    if (error.stderr) console.error('stderr:', error.stderr);
    process.exit(1);
  }
}

// Run the import
importVaccineRecords();
