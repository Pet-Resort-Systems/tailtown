/**
 * Fix Pet Breed Names
 * Updates breed field from Gingr breed_id to actual breed name
 *
 * Usage: node scripts/fix-pet-breeds.js <tenantId>
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function fixPetBreeds(tenantId) {
  console.log("🐕 Fix Pet Breed Names");
  console.log("======================");
  console.log(`Tenant: ${tenantId}`);
  console.log("");

  // Load breeds data from JSON file
  const breedsPath = path.join(
    __dirname,
    "../../../data/gingr-reference/breeds.json"
  );

  if (!fs.existsSync(breedsPath)) {
    console.error(`❌ Breeds file not found: ${breedsPath}`);
    process.exit(1);
  }

  const breedsData = JSON.parse(fs.readFileSync(breedsPath, "utf8"));
  console.log(`📚 Loaded ${breedsData.length} breeds from reference file`);

  // Create a map of breed ID to breed name
  const breedMap = new Map();
  breedsData.forEach((breed) => {
    breedMap.set(breed.value, breed.label);
  });

  // Find pets with numeric breed IDs (not already converted to names)
  console.log("\n🔍 Finding pets with numeric breed IDs...");

  const pets = await prisma.pet.findMany({
    where: {
      tenantId,
      breed: { not: null },
    },
    select: {
      id: true,
      name: true,
      breed: true,
    },
  });

  console.log(`   Found ${pets.length} pets with breed field`);

  // Filter to only pets with numeric breed IDs
  const petsToUpdate = pets.filter((pet) => {
    // Check if breed is a number (Gingr ID) vs a name
    return pet.breed && /^\d+$/.test(pet.breed.trim());
  });

  console.log(
    `   ${petsToUpdate.length} pets have numeric breed IDs (need updating)`
  );

  if (petsToUpdate.length === 0) {
    console.log("\n✅ All pets already have breed names!");
    return;
  }

  // Update pets
  console.log("\n🔄 Updating pets...");
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < petsToUpdate.length; i++) {
    const pet = petsToUpdate[i];

    // Progress logging
    if (i > 0 && i % 500 === 0) {
      console.log(
        `   Progress: ${i}/${petsToUpdate.length} (${updated} updated)`
      );
    }

    const breedName = breedMap.get(pet.breed.trim());

    if (breedName) {
      try {
        await prisma.pet.update({
          where: { id: pet.id },
          data: { breed: breedName },
        });
        updated++;
      } catch (error) {
        console.error(`   Error updating ${pet.name}: ${error.message}`);
        errors++;
      }
    } else {
      notFound++;
      if (notFound <= 10) {
        console.log(`   ⚠️ No breed found for ID: ${pet.breed} (${pet.name})`);
      }
    }
  }

  console.log("\n✅ Update complete!");
  console.log(`   Updated: ${updated}`);
  console.log(`   Breed ID not found: ${notFound}`);
  console.log(`   Errors: ${errors}`);

  // Show sample results
  console.log("\n📋 Sample updated pets:");
  const samples = await prisma.pet.findMany({
    where: { tenantId },
    take: 10,
    orderBy: { name: "asc" },
    select: { name: true, breed: true },
  });

  samples.forEach((pet) => {
    console.log(`   ${pet.name}: ${pet.breed || "N/A"}`);
  });
}

// Run
const tenantId = process.argv[2];
if (!tenantId) {
  console.error("Usage: node scripts/fix-pet-breeds.js <tenantId>");
  process.exit(1);
}

fixPetBreeds(tenantId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
