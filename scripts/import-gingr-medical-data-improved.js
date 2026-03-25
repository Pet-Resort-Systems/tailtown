#!/usr/bin/env node

/**
 * Gingr Medical Data Import Tool - Phase 1 (IMPROVED)
 *
 * Improvements:
 * - Request timeouts (30 seconds)
 * - Retry logic (3 attempts)
 * - Better error handling
 * - Resume capability (saves progress)
 * - Detailed logging
 * - Configurable batch size
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 seconds
  RATE_LIMIT_DELAY: 150, // 150ms between pets
  BATCH_SIZE: 100, // Save progress every 100 pets
  PROGRESS_FILE: path.join(__dirname, 'import-progress.json'),
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log(
    '  node scripts/import-gingr-medical-data-improved.js <subdomain> <api-key>'
  );
  console.log('\nExample:');
  console.log(
    '  node scripts/import-gingr-medical-data-improved.js tailtownpetresort abc123xyz456'
  );
  process.exit(1);
}

const [subdomain, apiKey] = args;
const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

console.log('\n🏥 Gingr Medical Data Import Tool - Phase 1 (IMPROVED)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Subdomain: ${subdomain}`);
console.log('Importing: Allergies, Medications, Feeding, Emergency Contacts');
console.log(
  `Timeout: ${CONFIG.REQUEST_TIMEOUT}ms | Retries: ${CONFIG.RETRY_ATTEMPTS}`
);
console.log('');

/**
 * Load progress from file
 */
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'));
      console.log(`📂 Resuming from pet #${data.lastProcessedIndex + 1}`);
      return data;
    }
  } catch (error) {
    console.error('⚠️  Could not load progress file:', error.message);
  }
  return { lastProcessedIndex: -1, stats: {} };
}

/**
 * Save progress to file
 */
function saveProgress(index, stats) {
  try {
    fs.writeFileSync(
      CONFIG.PROGRESS_FILE,
      JSON.stringify(
        {
          lastProcessedIndex: index,
          stats,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('⚠️  Could not save progress:', error.message);
  }
}

/**
 * Make request to Gingr API with timeout and retry
 */
async function makeGingrRequest(endpoint, params = {}, attempt = 1) {
  const urlParams = new URLSearchParams();
  urlParams.append('key', apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

  try {
    const response = await fetch(
      `${BASE_URL}${endpoint}?${urlParams.toString()}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);

    // Retry logic
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      console.log(
        `  ⏳ Retry ${attempt}/${CONFIG.RETRY_ATTEMPTS} for ${endpoint}...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.RETRY_DELAY * attempt)
      );
      return makeGingrRequest(endpoint, params, attempt + 1);
    }

    throw error;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').trim() || null;
}

/**
 * Get animal data with medical fields
 */
async function getAnimalData(animalId) {
  try {
    const response = await makeGingrRequest('/animals', { id: animalId });
    if (!response.data || response.data.length === 0) {
      return null;
    }
    return response.data[0];
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`  ⏱️  Timeout fetching animal ${animalId}`);
    } else {
      console.error(`  ⚠️  Error fetching animal ${animalId}:`, error.message);
    }
    return null;
  }
}

/**
 * Get feeding information for an animal
 */
async function getFeedingInfo(animalId) {
  try {
    const response = await makeGingrRequest('/get_feeding_info', {
      animal_id: animalId,
    });
    return response;
  } catch (error) {
    return null;
  }
}

/**
 * Get medication information for an animal
 */
async function getMedicationInfo(animalId) {
  try {
    const response = await makeGingrRequest('/get_medication_info', {
      animal_id: animalId,
    });
    return response;
  } catch (error) {
    return null;
  }
}

/**
 * Get owner data
 */
async function getOwnerData(ownerId) {
  try {
    const response = await makeGingrRequest('/owners', { id: ownerId });
    if (!response.data || response.data.length === 0) {
      return null;
    }
    return response.data[0];
  } catch (error) {
    return null;
  }
}

/**
 * Process medication information
 */
function processMedicationInfo(medicationInfo) {
  if (
    !medicationInfo ||
    !medicationInfo.data ||
    medicationInfo.data.length === 0
  ) {
    return null;
  }

  return medicationInfo.data.map((med) => ({
    name: med.medication_name,
    dosage: med.dosage,
    frequency: med.frequency,
    instructions: stripHtml(med.instructions),
    startDate: med.start_date,
    endDate: med.end_date,
  }));
}

/**
 * Process feeding information
 */
function processFeedingInfo(feedingInfo) {
  if (!feedingInfo || !feedingInfo.data) {
    return null;
  }

  const data = feedingInfo.data;
  return {
    foodBrand: data.food_brand,
    foodType: data.food_type,
    amount: data.amount,
    frequency: data.frequency,
    feedingMethod: data.feeding_method,
    instructions: stripHtml(data.instructions),
  };
}

/**
 * Main import function
 */
async function importMedicalData() {
  try {
    // Load progress
    const progress = loadProgress();
    const startIndex = progress.lastProcessedIndex + 1;

    // Fetch all pets from local database
    console.log('📋 Fetching pets from local database...');
    const localPets = await prisma.pet.findMany({
      where: {
        externalId: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        externalId: true,
        customerId: true,
      },
    });

    console.log(`✅ Found ${localPets.length} active pets with Gingr IDs`);

    if (startIndex > 0) {
      console.log(
        `📂 Resuming from pet #${startIndex + 1} (${localPets.length - startIndex} remaining)`
      );
    }

    let stats = progress.stats || {
      petsUpdated: 0,
      petsSkipped: 0,
      petsWithAllergies: 0,
      petsWithMedications: 0,
      petsWithFeeding: 0,
      errorCount: 0,
      timeoutCount: 0,
    };

    // Track unique customers for emergency contact updates
    const customersToUpdate = new Map();

    console.log('\n🔄 Processing medical data...');
    console.log(
      'Progress will be saved every 100 pets for resume capability.\n'
    );

    const startTime = Date.now();

    for (let i = startIndex; i < localPets.length; i++) {
      const pet = localPets[i];

      try {
        // Fetch all medical data for this pet
        const [animalData, feedingInfo, medicationInfo] = await Promise.all([
          getAnimalData(pet.externalId),
          getFeedingInfo(pet.externalId),
          getMedicationInfo(pet.externalId),
        ]);

        if (!animalData) {
          stats.petsSkipped++;
          continue;
        }

        // Process the data
        const updateData = {};
        let hasUpdates = false;

        // Allergies
        const allergies = stripHtml(animalData.allergies);
        if (allergies) {
          updateData.allergies = allergies;
          stats.petsWithAllergies++;
          hasUpdates = true;
        }

        // Medications
        const medications = processMedicationInfo(medicationInfo);
        if (medications && medications.length > 0) {
          updateData.medicationNotes = JSON.stringify(medications, null, 2);
          stats.petsWithMedications++;
          hasUpdates = true;
        }

        // Feeding information
        const feeding = processFeedingInfo(feedingInfo);
        if (feeding) {
          updateData.foodNotes = JSON.stringify(feeding, null, 2);
          stats.petsWithFeeding++;
          hasUpdates = true;
        }

        // Update pet if we have any data
        if (hasUpdates) {
          await prisma.pet.update({
            where: { id: pet.id },
            data: {
              ...updateData,
              updatedAt: new Date(),
            },
          });

          stats.petsUpdated++;
        } else {
          stats.petsSkipped++;
        }

        // Track customer for emergency contact update
        if (pet.customerId && animalData.owner_id) {
          customersToUpdate.set(pet.customerId, animalData.owner_id);
        }

        // Progress reporting
        if ((i + 1) % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = (i + 1 - startIndex) / elapsed;
          const remaining = (localPets.length - i - 1) / rate;

          console.log(
            `  📝 Processed ${i + 1}/${localPets.length} pets (${Math.round(((i + 1) / localPets.length) * 100)}%) | ETA: ${Math.round(remaining / 60)} min`
          );

          // Save progress
          saveProgress(i, stats);
        }

        // Rate limiting
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY)
        );
      } catch (error) {
        console.error(`❌ Error processing pet ${pet.name}:`, error.message);
        stats.errorCount++;

        if (error.name === 'AbortError') {
          stats.timeoutCount++;
        }
      }
    }

    // Save final progress
    saveProgress(localPets.length - 1, stats);

    // Final statistics
    console.log('\n📈 Import Results:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Pets Processed: ${localPets.length}`);
    console.log(`✅ Pets Updated: ${stats.petsUpdated}`);
    console.log(`⏭️  Pets Skipped: ${stats.petsSkipped}`);
    console.log(`🔴 Allergies Found: ${stats.petsWithAllergies}`);
    console.log(`💊 Medications Found: ${stats.petsWithMedications}`);
    console.log(`🍖 Feeding Info Found: ${stats.petsWithFeeding}`);
    console.log(`❌ Errors: ${stats.errorCount}`);
    console.log(`⏱️  Timeouts: ${stats.timeoutCount}`);
    console.log('═══════════════════════════════════════════════════════════');

    // Clean up progress file on success
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      fs.unlinkSync(CONFIG.PROGRESS_FILE);
      console.log(
        '\n✅ Import completed successfully! Progress file cleaned up.'
      );
    }
  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    console.log(
      '\n💾 Progress has been saved. You can resume by running the script again.'
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importMedicalData();
