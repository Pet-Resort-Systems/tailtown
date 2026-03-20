#!/usr/bin/env node

/**
 * Associate Pets to Veterinarians Script
 *
 * Automatically links pets to veterinarians based on historical vetName data
 * Uses fuzzy matching to find the best veterinarian match
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function associatePetsToVeterinarians() {
  console.log('🔗 Associating Pets to Veterinarians');
  console.log('═════════════════════════════════════════');

  try {
    // Get all pets with vetName but no veterinarianId
    const petsWithVetData = await prisma.$queryRaw`
      SELECT id, name, "vetName", "vetPhone"
      FROM pets
      WHERE "vetName" IS NOT NULL 
        AND "veterinarianId" IS NULL
        AND "isActive" = true
    `;

    console.log(
      `Found ${petsWithVetData.length} pets with vet data to process`
    );

    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const pet of petsWithVetData) {
      // Try to find exact match first
      let veterinarian = await prisma.$queryRaw`
        SELECT id, name, phone
        FROM veterinarians
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${pet.vetName}))
          AND "isActive" = true
        LIMIT 1
      `;

      // If no exact match, try fuzzy matching
      if (!veterinarian || veterinarian.length === 0) {
        veterinarian = await prisma.$queryRaw`
          SELECT id, name, phone,
            similarity(LOWER(name), LOWER(${pet.vetName})) as similarity_score
          FROM veterinarians
          WHERE "isActive" = true
            AND similarity(LOWER(name), LOWER(${pet.vetName})) > 0.3
          ORDER BY similarity_score DESC, name ASC
          LIMIT 1
        `;
      }

      if (veterinarian && veterinarian.length > 0) {
        const vet = veterinarian[0];

        // Update the pet with the veterinarian link
        await prisma.$executeRaw`
          UPDATE pets
          SET "veterinarianId" = ${vet.id},
              "updatedAt" = NOW()
          WHERE id = ${pet.id}
        `;

        console.log(
          `✅ Matched: ${pet.name} → ${vet.name} (score: ${vet.similarity_score || 'exact'})`
        );
        matchedCount++;
      } else {
        console.log(`❌ No match: ${pet.name} → "${pet.vetName}"`);
        unmatchedCount++;
      }
    }

    console.log('\n📊 Results Summary:');
    console.log(`═════════════════════════════════════════`);
    console.log(`✅ Successfully matched: ${matchedCount} pets`);
    console.log(`❌ No matches found: ${unmatchedCount} pets`);
    console.log(
      `📈 Success rate: ${((matchedCount / petsWithVetData.length) * 100).toFixed(1)}%`
    );

    // Show some examples of matched associations
    if (matchedCount > 0) {
      console.log('\n📋 Sample Associations:');
      const samples = await prisma.$queryRaw`
        SELECT p.name as pet_name, v.name as vet_name, v.phone
        FROM pets p
        JOIN veterinarians v ON p."veterinarianId" = v.id
        WHERE p."vetName" IS NOT NULL
        LIMIT 5
      `;

      samples.forEach((sample) => {
        console.log(
          `  • ${sample.pet_name} → ${sample.vet_name}${sample.phone ? ` (${sample.phone})` : ''}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error associating pets to veterinarians:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
associatePetsToVeterinarians().catch(console.error);
