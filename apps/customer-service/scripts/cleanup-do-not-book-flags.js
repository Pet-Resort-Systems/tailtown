/**
 * Cleanup DO_NOT_BOOK Flags
 *
 * Removes "DO_NOT_BOOK" from specialRequirements for all pets.
 *
 * Analysis showed that 7,899 pets have this flag but only 4 actually have
 * legitimate "STOP! DO NOT BOOK" warnings in Gingr. The flag appears to be
 * a Gingr color label template artifact that was applied broadly without
 * meaningful data.
 *
 * The 4 legitimate cases can be manually re-added if needed after staff review.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

async function cleanupDoNotBookFlags() {
  console.log('Starting cleanup of DO_NOT_BOOK flags...\n');

  // Get all pets with DO_NOT_BOOK in specialRequirements
  const petsWithFlag = await prisma.pet.findMany({
    where: {
      tenantId: TENANT_ID,
      specialRequirements: {
        has: 'DO_NOT_BOOK',
      },
    },
    select: {
      id: true,
      name: true,
      specialRequirements: true,
      owner: {
        select: {
          lastName: true,
        },
      },
    },
  });

  console.log(`Found ${petsWithFlag.length} pets with DO_NOT_BOOK flag\n`);

  let removedCount = 0;
  let errorCount = 0;

  for (const pet of petsWithFlag) {
    try {
      // Remove DO_NOT_BOOK from specialRequirements
      const updatedRequirements = pet.specialRequirements.filter(
        (req) => req !== 'DO_NOT_BOOK'
      );

      await prisma.pet.update({
        where: { id: pet.id },
        data: {
          specialRequirements: updatedRequirements,
        },
      });

      removedCount++;

      // Only log first 20 and last 20 to avoid overwhelming output
      if (removedCount <= 20 || removedCount > petsWithFlag.length - 20) {
        console.log(
          `✓ Removed DO_NOT_BOOK from ${pet.name} (${pet.owner.lastName})`
        );
      } else if (removedCount === 21) {
        console.log(`... (continuing, will show last 20) ...`);
      }
    } catch (error) {
      errorCount++;
      console.error(
        `✗ Error processing ${pet.name} (${pet.owner.lastName}):`,
        error.message
      );
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total pets with DO_NOT_BOOK flag: ${petsWithFlag.length}`);
  console.log(`Successfully removed: ${removedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('\nNote: If any pets legitimately need "do not book" warnings,');
  console.log('they should be manually reviewed and flagged appropriately.');

  await prisma.$disconnect();
}

cleanupDoNotBookFlags().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
