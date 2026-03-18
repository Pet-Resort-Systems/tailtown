/**
 * Cleanup Duplicate Pets and Old Warning Icons
 *
 * This script:
 * 1. Identifies duplicate pets (same name + customerId)
 * 2. Merges compatibility data from duplicates into the "best" record
 * 3. Updates all reservations to point to the merged record
 * 4. Clears old petIcons data that's causing unwanted warnings
 * 5. Deactivates duplicate records
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

async function cleanupDuplicatePets() {
  console.log('🔍 Starting duplicate pet cleanup...\n');

  try {
    // Step 1: Find all duplicate pets (same name + customerId)
    const duplicates = await prisma.$queryRaw`
      SELECT name, "customerId", COUNT(*) as count, ARRAY_AGG(id) as pet_ids
      FROM pets
      WHERE "tenantId" = ${TENANT_ID}
        AND "isActive" = true
      GROUP BY name, "customerId"
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `;

    console.log(`📊 Found ${duplicates.length} sets of duplicate pets\n`);

    let totalMerged = 0;
    let totalReservationsUpdated = 0;
    let totalIconsCleared = 0;

    for (const dup of duplicates) {
      const petIds = dup.pet_ids;

      // Get full details of all duplicates
      const pets = await prisma.pet.findMany({
        where: { id: { in: petIds } },
        include: {
          reservations: {
            where: {
              status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
            },
          },
        },
      });

      // Find the "best" pet record (one with most data)
      const bestPet = pets.reduce((best, current) => {
        const bestScore =
          (best.playgroupCompatibility ? 10 : 0) +
          (best.specialRequirements?.length || 0) +
          (best.aggressionFlags?.length || 0) +
          (best.healthFlags?.length || 0) +
          (best.behaviorFlags?.length || 0) +
          (best.profilePhoto ? 5 : 0) +
          (best.breed ? 2 : 0);

        const currentScore =
          (current.playgroupCompatibility ? 10 : 0) +
          (current.specialRequirements?.length || 0) +
          (current.aggressionFlags?.length || 0) +
          (current.healthFlags?.length || 0) +
          (current.behaviorFlags?.length || 0) +
          (current.profilePhoto ? 5 : 0) +
          (current.breed ? 2 : 0);

        return currentScore > bestScore ? current : best;
      });

      console.log(`\n📝 Processing: ${dup.name} (${dup.count} duplicates)`);
      console.log(`   Best record: ${bestPet.id}`);
      console.log(`   Playgroup: ${bestPet.playgroupCompatibility || 'none'}`);

      // Merge compatibility data from all duplicates
      const mergedData = {
        playgroupCompatibility: bestPet.playgroupCompatibility,
        specialRequirements: bestPet.specialRequirements || [],
        aggressionFlags: bestPet.aggressionFlags || [],
        healthFlags: bestPet.healthFlags || [],
        behaviorFlags: bestPet.behaviorFlags || [],
        compatibilityNotes: bestPet.compatibilityNotes,
        groomingPreferences: bestPet.groomingPreferences,
        staffRequirements: bestPet.staffRequirements,
      };

      // Collect data from other duplicates
      for (const pet of pets) {
        if (pet.id === bestPet.id) continue;

        if (pet.playgroupCompatibility && !mergedData.playgroupCompatibility) {
          mergedData.playgroupCompatibility = pet.playgroupCompatibility;
        }
        if (pet.specialRequirements?.length) {
          mergedData.specialRequirements = [
            ...new Set([
              ...mergedData.specialRequirements,
              ...pet.specialRequirements,
            ]),
          ];
        }
        if (pet.aggressionFlags?.length) {
          mergedData.aggressionFlags = [
            ...mergedData.aggressionFlags,
            ...pet.aggressionFlags,
          ];
        }
        if (pet.healthFlags?.length) {
          mergedData.healthFlags = [
            ...mergedData.healthFlags,
            ...pet.healthFlags,
          ];
        }
        if (pet.behaviorFlags?.length) {
          mergedData.behaviorFlags = [
            ...mergedData.behaviorFlags,
            ...pet.behaviorFlags,
          ];
        }
      }

      // Update the best pet with merged data and clear old petIcons
      await prisma.pet.update({
        where: { id: bestPet.id },
        data: {
          ...mergedData,
          petIcons: [], // Clear old warning icons
        },
      });

      if (bestPet.petIcons?.length > 0) {
        totalIconsCleared++;
      }

      // Update all reservations from duplicates to point to best pet
      const duplicateIds = petIds.filter((id) => id !== bestPet.id);

      if (duplicateIds.length > 0) {
        const updateResult = await prisma.reservation.updateMany({
          where: {
            petId: { in: duplicateIds },
          },
          data: {
            petId: bestPet.id,
          },
        });

        totalReservationsUpdated += updateResult.count;

        // Deactivate duplicate pets
        await prisma.pet.updateMany({
          where: {
            id: { in: duplicateIds },
          },
          data: {
            isActive: false,
            deactivationReason: 'Duplicate record - merged into ' + bestPet.id,
          },
        });

        console.log(`   ✅ Merged ${duplicateIds.length} duplicates`);
        console.log(`   📋 Updated ${updateResult.count} reservations`);
        totalMerged += duplicateIds.length;
      }
    }

    // Step 2: Clear old petIcons from all remaining active pets
    console.log('\n🧹 Clearing old petIcons from all active pets...');

    const iconClearResult = await prisma.pet.updateMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        petIcons: { not: [] },
      },
      data: {
        petIcons: [],
      },
    });

    totalIconsCleared += iconClearResult.count;

    console.log('\n✅ Cleanup Complete!');
    console.log(`   📊 Total duplicate sets processed: ${duplicates.length}`);
    console.log(`   🔀 Total duplicate pets deactivated: ${totalMerged}`);
    console.log(
      `   📋 Total reservations updated: ${totalReservationsUpdated}`
    );
    console.log(`   🧹 Total old icons cleared: ${totalIconsCleared}`);

    // Verification
    console.log('\n📊 Final Statistics:');
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_active_pets,
        COUNT(DISTINCT name || "customerId") as unique_pets,
        COUNT(CASE WHEN "playgroupCompatibility" IS NOT NULL THEN 1 END) as with_playgroup,
        COUNT(CASE WHEN "petIcons" != '[]' THEN 1 END) as with_old_icons
      FROM pets
      WHERE "tenantId" = ${TENANT_ID}
        AND "isActive" = true
    `;

    console.log(`   Active pets: ${stats[0].total_active_pets}`);
    console.log(`   Unique pets: ${stats[0].unique_pets}`);
    console.log(`   With playgroup: ${stats[0].with_playgroup}`);
    console.log(`   With old icons: ${stats[0].with_old_icons}`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicatePets()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
