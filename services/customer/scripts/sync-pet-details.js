/**
 * Sync Pet Details from Gingr
 *
 * This script updates existing pets with detailed information from Gingr,
 * including breed names, gender, vet info, and all notes/medical info.
 *
 * Usage: node scripts/sync-pet-details.js <tenantId>
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Gingr API configuration
const GINGR_SUBDOMAIN = process.env.GINGR_SUBDOMAIN || "tailtownpetresort";
const GINGR_API_KEY =
  process.env.GINGR_API_KEY || "c84c09ecfacdf23a495505d2ae1df533";
const BASE_URL = `https://${GINGR_SUBDOMAIN}.gingrapp.com/api/v1`;

// Rate limiting
let lastRequestTime = 0;
async function rateLimit() {
  const now = Date.now();
  const timeSince = now - lastRequestTime;
  if (timeSince < 150) {
    await new Promise((r) => setTimeout(r, 150 - timeSince));
  }
  lastRequestTime = Date.now();
}

// Generic GET request
async function gingrGet(endpoint, params = {}) {
  await rateLimit();
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append("key", GINGR_API_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
  });

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.message || data.error);
  return data;
}

// Generic POST request
async function gingrPost(endpoint, data = {}) {
  await rateLimit();
  const formData = new URLSearchParams();
  formData.append("key", GINGR_API_KEY);
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) formData.append(k, String(v));
  });

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.error) throw new Error(result.message || result.error);
  return result;
}

// Strip HTML tags from text
function stripHtml(html) {
  if (!html) return null;
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

// Build breed mapping from reservations
async function buildBreedMapping() {
  console.log("📚 Building breed mapping from reservations...");
  const breedMap = new Map(); // animal_id -> breed_name

  // Fetch reservations from last 2 years to get breed names
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);

  let currentStart = new Date(startDate);
  while (currentStart < endDate) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 29);
    const chunkEnd = currentEnd > endDate ? endDate : currentEnd;

    try {
      const response = await gingrPost("/reservations", {
        start_date: currentStart.toISOString().split("T")[0],
        end_date: chunkEnd.toISOString().split("T")[0],
      });

      const reservations = response.data || {};
      const items = Array.isArray(reservations)
        ? reservations
        : Object.values(reservations);

      for (const res of items) {
        if (res.animal?.id && res.animal?.breed) {
          breedMap.set(res.animal.id, res.animal.breed);
        }
      }
    } catch (error) {
      console.error(`   Error fetching reservations chunk: ${error.message}`);
    }

    currentStart = new Date(chunkEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  console.log(`   Found breed names for ${breedMap.size} animals`);
  return breedMap;
}

// Main sync function
async function syncPetDetails(tenantId) {
  console.log("🐕 Pet Details Sync from Gingr");
  console.log("================================");
  console.log(`Tenant: ${tenantId}`);
  console.log("");

  // Step 1: Build breed mapping
  const breedMap = await buildBreedMapping();

  // Step 2: Fetch all animals from Gingr
  console.log("\n📥 Fetching animals from Gingr...");
  const response = await gingrGet("/animals");
  const animals = response.data || [];
  console.log(`   Found ${animals.length} animals`);

  // Step 3: Get existing pets from database
  console.log("\n🔍 Loading existing pets from database...");
  const existingPets = await prisma.pet.findMany({
    where: { tenantId, externalId: { not: null } },
    select: { id: true, externalId: true, notes: true },
  });
  const petMap = new Map(existingPets.map((p) => [p.externalId, p]));
  console.log(`   Found ${existingPets.length} pets with externalId`);

  // Step 4: Update pets
  console.log("\n🔄 Updating pets...");
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (let i = 0; i < animals.length; i++) {
    const animal = animals[i];

    // Progress logging
    if (i > 0 && i % 500 === 0) {
      console.log(`   Progress: ${i}/${animals.length} (${updated} updated)`);
    }

    // Find existing pet
    const existingPet = petMap.get(animal.id);
    if (!existingPet) {
      notFound++;
      continue;
    }

    try {
      // Get breed name from mapping
      const breedName = breedMap.get(animal.id) || null;

      // Parse gender - Gingr uses "Male"/"Female" strings
      let gender = null;
      if (animal.gender) {
        const g = animal.gender.toLowerCase();
        if (g === "male" || g === "m") gender = "MALE";
        else if (g === "female" || g === "f") gender = "FEMALE";
      }

      // Parse birthdate
      let birthdate = null;
      if (animal.birthday) {
        birthdate = new Date(parseInt(animal.birthday) * 1000);
        if (isNaN(birthdate.getTime())) birthdate = null;
      }

      // Parse weight
      let weight = null;
      if (animal.weight) {
        weight = parseFloat(animal.weight);
        if (isNaN(weight)) weight = null;
      }

      // Compile additional notes for fields we don't have direct mappings for
      const additionalNotes = [];

      // Feeding info
      if (animal.feeding_schedule) {
        additionalNotes.push(`Feeding Schedule: ${animal.feeding_schedule}`);
      }
      if (animal.feeding_method) {
        const methods = { 1: "Bowl", 2: "Slow Feeder", 3: "Hand Fed" };
        additionalNotes.push(
          `Feeding Method: ${
            methods[animal.feeding_method] || animal.feeding_method
          }`
        );
      }
      if (animal.food_type) {
        const types = { 1: "Dry", 2: "Wet", 3: "Raw", 4: "Mixed", 5: "Other" };
        additionalNotes.push(
          `Food Type: ${types[animal.food_type] || animal.food_type}`
        );
      }

      // Evaluation info
      if (animal.evaluation_categories) {
        additionalNotes.push(
          `Evaluation Categories: ${animal.evaluation_categories}`
        );
      }
      if (animal.evaluation_notes) {
        additionalNotes.push(
          `Evaluation Notes: ${stripHtml(animal.evaluation_notes)}`
        );
      }

      // Incident count
      if (animal.incident_count && parseInt(animal.incident_count) > 0) {
        additionalNotes.push(`Incident Count: ${animal.incident_count}`);
      }

      // VIP/Banned status
      if (animal.vip === "1") {
        additionalNotes.push("⭐ VIP Pet");
      }
      if (animal.banned === "1") {
        additionalNotes.push("🚫 BANNED");
      }

      // Build combined notes
      let combinedNotes = stripHtml(animal.notes) || "";
      if (additionalNotes.length > 0) {
        const separator = combinedNotes ? "\n\n--- Gingr Data ---\n" : "";
        combinedNotes = combinedNotes + separator + additionalNotes.join("\n");
      }

      // Prepare update data
      const updateData = {
        breed: breedName,
        gender: gender,
        birthdate: birthdate,
        weight: weight,
        color: animal.color || null,
        microchipNumber: animal.microchip || null,
        isNeutered: animal.fixed === "1",
        notes: combinedNotes || null,
        foodNotes: stripHtml(animal.feeding_notes) || null,
        medicationNotes: stripHtml(animal.medicines) || null,
        allergies: stripHtml(animal.allergies) || null,
        behaviorNotes: stripHtml(animal.grooming_notes) || null,
        specialNeeds: stripHtml(animal.temperment) || null,
        profilePhoto: animal.image || null,
      };

      // Only update fields that have values (don't overwrite with null)
      const filteredUpdate = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== null && value !== undefined && value !== "") {
          filteredUpdate[key] = value;
        }
      }

      if (Object.keys(filteredUpdate).length > 0) {
        await prisma.pet.update({
          where: { id: existingPet.id },
          data: filteredUpdate,
        });
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`   Error updating pet ${animal.id}: ${error.message}`);
    }
  }

  console.log("\n✅ Sync complete!");
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no changes): ${skipped}`);
  console.log(`   Not found in DB: ${notFound}`);
}

// Run
const tenantId = process.argv[2];
if (!tenantId) {
  console.error("Usage: node scripts/sync-pet-details.js <tenantId>");
  process.exit(1);
}

syncPetDetails(tenantId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
