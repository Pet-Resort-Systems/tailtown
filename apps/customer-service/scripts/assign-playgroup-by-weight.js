/**
 * Assign Playgroup Compatibility by Weight
 *
 * Assigns playgroupCompatibility based on pet weight:
 * - SMALL_DOG: < 25 lbs
 * - MEDIUM_DOG: 25-50 lbs
 * - LARGE_DOG: > 50 lbs
 *
 * Only updates pets that don't already have a playgroup assigned.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

// Weight thresholds in pounds
const SMALL_DOG_MAX = 25;
const MEDIUM_DOG_MAX = 50;

function getPlaygroupByWeight(weight) {
  if (weight < SMALL_DOG_MAX) return 'SMALL_DOG';
  if (weight <= MEDIUM_DOG_MAX) return 'MEDIUM_DOG';
  return 'LARGE_DOG';
}

async function assignPlaygroupByWeight() {
  console.log('🐕 Assigning playgroup compatibility by weight...\n');

  try {
    // Get pets without playgroup compatibility but with weight
    const petsToUpdate = await prisma.pet.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        type: 'DOG', // Only dogs get playgroup assignments
        weight: { not: null },
        playgroupCompatibility: null,
      },
      select: {
        id: true,
        name: true,
        weight: true,
        owner: {
          select: {
            lastName: true,
          },
        },
      },
    });

    console.log(
      `Found ${petsToUpdate.length} dogs without playgroup assignment\n`
    );

    let smallCount = 0;
    let mediumCount = 0;
    let largeCount = 0;

    for (const pet of petsToUpdate) {
      const playgroup = getPlaygroupByWeight(pet.weight);

      await prisma.pet.update({
        where: { id: pet.id },
        data: { playgroupCompatibility: playgroup },
      });

      if (playgroup === 'SMALL_DOG') smallCount++;
      else if (playgroup === 'MEDIUM_DOG') mediumCount++;
      else largeCount++;
    }

    console.log('📊 Summary:');
    console.log(`   🐕 Small Dogs (< ${SMALL_DOG_MAX} lbs): ${smallCount}`);
    console.log(
      `   🐕 Medium Dogs (${SMALL_DOG_MAX}-${MEDIUM_DOG_MAX} lbs): ${mediumCount}`
    );
    console.log(`   🐕 Large Dogs (> ${MEDIUM_DOG_MAX} lbs): ${largeCount}`);
    console.log(`   ✅ Total updated: ${petsToUpdate.length}`);

    // Final stats
    const finalStats = await prisma.pet.groupBy({
      by: ['playgroupCompatibility'],
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        type: 'DOG',
      },
      _count: true,
    });

    console.log('\n📈 Final playgroup distribution:');
    for (const stat of finalStats) {
      console.log(
        `   ${stat.playgroupCompatibility || 'NULL'}: ${stat._count}`
      );
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

assignPlaygroupByWeight();
