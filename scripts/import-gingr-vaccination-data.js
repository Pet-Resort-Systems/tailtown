#!/usr/bin/env node

/**
 * Gingr Vaccination Data Import Tool
 *
 * Imports vaccination expiration dates from Gingr API into Tailtown
 * Maps next_immunization_expiration to vaccineExpirations field
 *
 * Usage:
 *   node scripts/import-gingr-vaccination-data.js <subdomain> <api-key>
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log(
    '  node scripts/import-gingr-vaccination-data.js <subdomain> <api-key>'
  );
  console.log('\nExample:');
  console.log(
    '  node scripts/import-gingr-vaccination-data.js tailtownpetresort abc123xyz456'
  );
  process.exit(1);
}

const [subdomain, apiKey] = args;
const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

console.log('\n💉 Gingr Vaccination Data Import Tool');
console.log('═══════════════════════════════════════════════════');
console.log(`Subdomain: ${subdomain}`);
console.log('');

/**
 * Make request to Gingr API
 */
async function makeGingrRequest(endpoint, data = {}) {
  const params = new URLSearchParams();
  params.append('key', apiKey);

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const response = await fetch(`${BASE_URL}${endpoint}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(
      `Gingr API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Convert Unix timestamp to ISO date string
 */
function convertUnixTimestampToDate(timestamp) {
  if (!timestamp || timestamp === '0' || timestamp === '') {
    return null;
  }

  const date = new Date(parseInt(timestamp) * 1000);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Create vaccination status from expiration date
 */
function createVaccinationStatus(expirationDate) {
  if (!expirationDate) {
    return {};
  }

  const now = new Date();
  const expiration = new Date(expirationDate);
  const isCurrent = expiration > now;

  return {
    General: {
      status: isCurrent ? 'CURRENT' : 'EXPIRED',
      expiration: expirationDate,
      lastChecked: new Date().toISOString(),
    },
  };
}

/**
 * Import vaccination data from Gingr
 */
async function importVaccinationData() {
  console.log('📋 Fetching vaccination data from Gingr...');

  try {
    const response = await makeGingrRequest('/animals', {});

    if (!response.data || response.data.length === 0) {
      console.log('ℹ️ No pet data found in Gingr');
      return;
    }

    console.log(`✅ Found ${response.data.length} pets in Gingr`);

    // Filter pets with vaccination data
    const petsWithVaccination = response.data.filter(
      (pet) =>
        pet.next_immunization_expiration &&
        pet.next_immunization_expiration !== '0' &&
        pet.next_immunization_expiration !== ''
    );

    console.log(`📊 Pets with vaccination data: ${petsWithVaccination.length}`);
    console.log(
      `📈 Coverage: ${((petsWithVaccination.length / response.data.length) * 100).toFixed(1)}%`
    );

    // Get local pets for matching
    const localPets = await prisma.pet.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        externalId: true,
        customerId: true,
        vaccinationStatus: true,
        vaccineExpirations: true,
      },
    });

    console.log(`📊 Local pets in database: ${localPets.length}`);

    // Create maps for efficient lookup
    const localPetMap = new Map();
    localPets.forEach((pet) => {
      if (pet.externalId) {
        localPetMap.set(pet.externalId, pet);
      }
    });

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('\n🔄 Processing vaccination data...');

    for (const gingrPet of petsWithVaccination) {
      try {
        // Find matching local pet
        const localPet = localPetMap.get(gingrPet.id);

        if (!localPet) {
          skippedCount++;
          continue;
        }

        // Convert vaccination data
        const expirationDate = convertUnixTimestampToDate(
          gingrPet.next_immunization_expiration
        );

        if (!expirationDate) {
          console.log(
            `⚠️  Skipping ${gingrPet.first_name}: Invalid expiration date`
          );
          skippedCount++;
          continue;
        }

        // Create vaccination status and expiration data
        const vaccinationStatus = createVaccinationStatus(expirationDate);
        const vaccineExpirations = {
          General: expirationDate,
        };

        // Update pet with vaccination data
        await prisma.pet.update({
          where: { id: localPet.id },
          data: {
            vaccinationStatus: vaccinationStatus,
            vaccineExpirations: vaccineExpirations,
            updatedAt: new Date(),
          },
        });

        updatedCount++;

        if (updatedCount % 100 === 0) {
          console.log(`  📝 Updated ${updatedCount} pets...`);
        }
      } catch (error) {
        console.error(
          `❌ Error processing pet ${gingrPet.first_name}:`,
          error.message
        );
        errorCount++;
      }
    }

    // Final statistics
    const finalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN "vaccinationStatus" IS NOT NULL THEN 1 END) as pets_with_vaccination_status,
        COUNT(CASE WHEN "vaccineExpirations" IS NOT NULL THEN 1 END) as pets_with_expirations,
        COUNT(*) as total_pets
      FROM pets 
      WHERE "isActive" = true
    `;

    console.log('\n📈 Import Results:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Pets updated: ${updatedCount}`);
    console.log(`⚠️  Pets skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total pets processed: ${petsWithVaccination.length}`);

    console.log('\n📊 Final Database Statistics:');
    console.log(
      `🐕 Pets with vaccination status: ${finalStats[0].pets_with_vaccination_status} / ${finalStats[0].total_pets}`
    );
    console.log(
      `💉 Pets with expiration dates: ${finalStats[0].pets_with_expirations} / ${finalStats[0].total_pets}`
    );
    console.log(
      `📈 Vaccination coverage: ${((finalStats[0].pets_with_vaccination_status / finalStats[0].total_pets) * 100).toFixed(1)}%`
    );

    // Show some examples
    const examples = await prisma.pet.findMany({
      where: {
        vaccinationStatus: { not: null },
        isActive: true,
      },
      select: {
        name: true,
        vaccinationStatus: true,
        vaccineExpirations: true,
      },
      take: 5,
    });

    console.log('\n💉 Examples of Imported Vaccination Data:');
    examples.forEach((pet) => {
      console.log(`\n🐕 ${pet.name}:`);
      console.log(`  Status: ${JSON.stringify(pet.vaccinationStatus)}`);
      console.log(`  Expirations: ${JSON.stringify(pet.vaccineExpirations)}`);
    });
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await importVaccinationData();

    console.log('\n🎉 Vaccination Import Complete!');
    console.log('💡 Next Steps:');
    console.log('1. Update pet management UI to display vaccination records');
    console.log('2. Add vaccination expiration alerts');
    console.log('3. Create vaccination reporting features');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
main();
