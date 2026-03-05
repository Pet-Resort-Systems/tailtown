#!/usr/bin/env node

/**
 * Gingr Reference Data Import Tool
 * 
 * Fetches reference data from Gingr API for use in Tailtown
 * - Breeds
 * - Species
 * - Temperaments
 * - Veterinarians
 * - Locations
 * - Reservation Types
 * - Immunization Types
 * 
 * Usage:
 *   node scripts/import-gingr-reference-data.js <subdomain> <api-key>
 * 
 * Example:
 *   node scripts/import-gingr-reference-data.js tailtown abc123xyz456
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log('  node scripts/import-gingr-reference-data.js <subdomain> <api-key>');
  console.log('\nExample:');
  console.log('  node scripts/import-gingr-reference-data.js tailtown abc123xyz456');
  process.exit(1);
}

const [subdomain, apiKey] = args;
const BASE_URL = `https://${subdomain}.gingrapp.com/api/v1`;

console.log('\n📚 Gingr Reference Data Import Tool');
console.log('═══════════════════════════════════');
console.log(`Subdomain: ${subdomain}`);
console.log('');

/**
 * Make POST request to Gingr API
 */
async function gingrPostRequest(endpoint, data = {}) {
  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gingr API error: ${response.status} ${response.statusMessage}\n${text}`);
  }
  
  return response.json();
}

/**
 * Make GET request to Gingr API
 */
async function gingrGetRequest(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append('key', apiKey);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gingr API error: ${response.status} ${response.statusMessage}`);
  }
  
  return response.json();
}

/**
 * Fetch all reference data
 */
async function fetchAllReferenceData() {
  const data = {};
  
  console.log('📥 Fetching reference data from Gingr...\n');
  
  // Breeds
  try {
    console.log('  🐕 Fetching breeds...');
    const response = await gingrGetRequest('/get_breeds');
    data.breeds = response.breeds || response.data || response;
    if (!Array.isArray(data.breeds)) {
      data.breeds = Object.values(data.breeds);
    }
    console.log(`     ✅ Found ${data.breeds.length} breeds\n`);
  } catch (error) {
    console.log(`     ❌ Error: ${error.message}\n`);
    data.breeds = [];
  }
  
  // Species
  try {
    console.log('  🦴 Fetching species...');
    const response = await gingrGetRequest('/get_species');
    data.species = response.species || response.data || response;
    if (!Array.isArray(data.species)) {
      data.species = Object.values(data.species);
    }
    console.log(`     ✅ Found ${data.species.length} species\n`);
  } catch (error) {
    console.log(`     ❌ Error: ${error.message}\n`);
    data.species = [];
  }
  
  // Temperaments
  try {
    console.log('  😊 Fetching temperaments...');
    const response = await gingrGetRequest('/get_temperaments');
    data.temperaments = response.temperaments || response.data || response;
    if (!Array.isArray(data.temperaments)) {
      data.temperaments = Object.values(data.temperaments);
    }
    console.log(`     ✅ Found ${data.temperaments.length} temperaments\n`);
  } catch (error) {
    console.log(`     ❌ Error: ${error.message}\n`);
    data.temperaments = [];
  }
  
  // Veterinarians
  try {
    console.log('  🏥 Fetching veterinarians...');
    const response = await gingrGetRequest('/get_vets', { vetFlag: true });
    data.vets = response.vets || response.data || response;
    if (!Array.isArray(data.vets)) {
      data.vets = Object.values(data.vets);
    }
    console.log(`     ✅ Found ${data.vets.length} veterinarians\n`);
  } catch (error) {
    console.log(`     ❌ Error: ${error.message}\n`);
    data.vets = [];
  }
  
  // Locations
  try {
    console.log('  📍 Fetching locations...');
    const response = await gingrGetRequest('/get_locations');
    data.locations = response.locations || response.data || response;
    if (!Array.isArray(data.locations)) {
      data.locations = Object.values(data.locations);
    }
    console.log(`     ✅ Found ${data.locations.length} locations\n`);
  } catch (error) {
    console.log(`     ❌ Error: ${error.message}\n`);
    data.locations = [];
  }
  
  // Reservation Types (Services)
  try {
    console.log('  📋 Fetching reservation types...');
    const response = await gingrGetRequest('/reservation_types', { active_only: true });
    data.reservationTypes = response.reservation_types || response.data || response;
    if (!Array.isArray(data.reservationTypes)) {
      data.reservationTypes = Object.values(data.reservationTypes);
    }
    console.log(`     ✅ Found ${data.reservationTypes.length} reservation types\n`);
  } catch (error) {
    console.log(`     ❌ Error: ${error.message}\n`);
    data.reservationTypes = [];
  }
  
  // Immunization Types (for each species)
  data.immunizations = {};
  if (data.species && data.species.length > 0) {
    console.log('  💉 Fetching immunization types...');
    for (const species of data.species) {
      try {
        const response = await gingrGetRequest('/get_immunization_types', { species_id: species.id });
        let immunizations = response.immunization_types || response.immunizations || response.data || response;
        if (!Array.isArray(immunizations)) {
          immunizations = Object.values(immunizations);
        }
        const speciesName = species.name || species.species_name || `Species ${species.id}`;
        data.immunizations[speciesName] = immunizations;
        console.log(`     ✅ ${speciesName}: ${immunizations.length} immunization types`);
      } catch (error) {
        const speciesName = species.name || species.species_name || `Species ${species.id}`;
        console.log(`     ❌ ${speciesName}: ${error.message}`);
        data.immunizations[speciesName] = [];
      }
    }
    console.log('');
  }
  
  return data;
}

/**
 * Display summary
 */
function displaySummary(data) {
  console.log('\n📊 REFERENCE DATA SUMMARY');
  console.log('═══════════════════════════════════\n');
  
  // Breeds
  if (data.breeds && data.breeds.length > 0) {
    console.log(`🐕 BREEDS (${data.breeds.length} total):`);
    console.log('─────────────────────────────────');
    
    // Group by species if available
    const breedsBySpecies = {};
    data.breeds.forEach(breed => {
      const speciesName = breed.species_name || breed.species || 'Unknown';
      if (!breedsBySpecies[speciesName]) {
        breedsBySpecies[speciesName] = [];
      }
      breedsBySpecies[speciesName].push(breed.name || breed.breed_name || breed.breed || JSON.stringify(breed));
    });
    
    Object.entries(breedsBySpecies).forEach(([species, breeds]) => {
      console.log(`\n  ${species} (${breeds.length}):`);
      breeds.slice(0, 10).forEach(breed => console.log(`    • ${breed}`));
      if (breeds.length > 10) {
        console.log(`    ... and ${breeds.length - 10} more`);
      }
    });
    console.log('');
  }
  
  // Species
  if (data.species && data.species.length > 0) {
    console.log(`\n🦴 SPECIES (${data.species.length} total):`);
    console.log('─────────────────────────────────');
    data.species.forEach(species => {
      const name = species.name || species.species_name || JSON.stringify(species);
      const id = species.id || 'N/A';
      console.log(`  • ${name} (ID: ${id})`);
    });
    console.log('');
  }
  
  // Temperaments
  if (data.temperaments && data.temperaments.length > 0) {
    console.log(`\n😊 TEMPERAMENTS (${data.temperaments.length} total):`);
    console.log('─────────────────────────────────');
    data.temperaments.forEach(temp => {
      const name = temp.name || temp.temperament_name || JSON.stringify(temp);
      console.log(`  • ${name}`);
    });
    console.log('');
  }
  
  // Vets
  if (data.vets && data.vets.length > 0) {
    console.log(`\n🏥 VETERINARIANS (${data.vets.length} total):`);
    console.log('─────────────────────────────────');
    data.vets.slice(0, 10).forEach(vet => {
      const name = vet.name || vet.vet_name || JSON.stringify(vet);
      const phone = vet.phone || vet.vet_phone || '';
      console.log(`  • ${name}${phone ? ` - ${phone}` : ''}`);
    });
    if (data.vets.length > 10) {
      console.log(`  ... and ${data.vets.length - 10} more`);
    }
    console.log('');
  }
  
  // Locations
  if (data.locations && data.locations.length > 0) {
    console.log(`\n📍 LOCATIONS (${data.locations.length} total):`);
    console.log('─────────────────────────────────');
    data.locations.forEach(loc => {
      const name = loc.name || loc.location_name || JSON.stringify(loc);
      const id = loc.id || 'N/A';
      console.log(`  • ${name} (ID: ${id})`);
      if (loc.address) console.log(`    ${loc.address}`);
    });
    console.log('');
  }
  
  // Reservation Types
  if (data.reservationTypes && data.reservationTypes.length > 0) {
    console.log(`\n📋 RESERVATION TYPES (${data.reservationTypes.length} total):`);
    console.log('─────────────────────────────────');
    data.reservationTypes.forEach(type => {
      const name = type.name || type.type_name || JSON.stringify(type);
      const id = type.id || 'N/A';
      console.log(`  • ${name} (ID: ${id})`);
      if (type.description) console.log(`    ${type.description}`);
    });
    console.log('');
  }
  
  // Immunizations
  if (data.immunizations && Object.keys(data.immunizations).length > 0) {
    console.log(`\n💉 IMMUNIZATION TYPES:`);
    console.log('─────────────────────────────────');
    Object.entries(data.immunizations).forEach(([species, immunizations]) => {
      console.log(`\n  ${species} (${immunizations.length}):`);
      if (Array.isArray(immunizations) && immunizations.length > 0) {
        immunizations.forEach(imm => {
          const name = imm.name || imm.immunization_name || JSON.stringify(imm);
          console.log(`    • ${name}`);
        });
      }
    });
    console.log('');
  }
}

/**
 * Save data to JSON files
 */
function saveToFiles(data) {
  const outputDir = path.join(__dirname, '..', 'data', 'gingr-reference');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('\n💾 SAVING DATA TO FILES');
  console.log('═══════════════════════════════════\n');
  
  // Save each dataset
  Object.entries(data).forEach(([key, value]) => {
    if (value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) {
      const filename = `${key}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(value, null, 2));
      console.log(`  ✅ Saved ${filename}`);
    }
  });
  
  // Save complete dataset
  const allDataPath = path.join(outputDir, 'all-reference-data.json');
  fs.writeFileSync(allDataPath, JSON.stringify(data, null, 2));
  console.log(`  ✅ Saved all-reference-data.json`);
  
  console.log(`\n📁 Files saved to: ${outputDir}\n`);
}

/**
 * Generate usage recommendations
 */
function generateRecommendations(data) {
  console.log('\n💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════\n');
  
  console.log('1. BREEDS');
  console.log('   • Import into Tailtown as dropdown options for pet breed field');
  console.log('   • Consider grouping by species (Dog, Cat, etc.)');
  console.log('   • Add autocomplete search for large breed lists\n');
  
  console.log('2. SPECIES');
  console.log('   • Map to Tailtown PetType enum');
  console.log('   • Current Tailtown types: DOG, CAT, BIRD, REPTILE, SMALL_MAMMAL, OTHER');
  console.log('   • May need to add new types based on Gingr data\n');
  
  console.log('3. TEMPERAMENTS');
  console.log('   • Use for pet behavior profiles');
  console.log('   • Can help with playgroup assignments');
  console.log('   • Consider adding to pet form as checkboxes\n');
  
  console.log('4. VETERINARIANS');
  console.log('   • Pre-populate vet dropdown in pet forms');
  console.log('   • Save time for customers during registration');
  console.log('   • Include phone numbers for quick contact\n');
  
  console.log('5. RESERVATION TYPES');
  console.log('   • Map to Tailtown Services');
  console.log('   • Use for service offerings and pricing');
  console.log('   • Consider service categories (Boarding, Daycare, Grooming, etc.)\n');
  
  console.log('6. IMMUNIZATION TYPES');
  console.log('   • Use for vaccination tracking');
  console.log('   • Species-specific requirements');
  console.log('   • Set up expiration reminders\n');
}

/**
 * Main function
 */
async function main() {
  try {
    // Fetch all data
    const data = await fetchAllReferenceData();
    
    // Display summary
    displaySummary(data);
    
    // Save to files
    saveToFiles(data);
    
    // Generate recommendations
    generateRecommendations(data);
    
    console.log('✅ Import complete!\n');
    console.log('📚 Next Steps:');
    console.log('   1. Review the JSON files in data/gingr-reference/');
    console.log('   2. Decide which data to import into Tailtown');
    console.log('   3. Update database schema if needed');
    console.log('   4. Create migration scripts for selected data');
    console.log('   5. Update apps/frontend forms with new options\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
