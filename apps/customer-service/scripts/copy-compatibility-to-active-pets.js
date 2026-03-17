/**
 * Copy Compatibility Data to Active Pet Records
 *
 * For pets with the same name where:
 * - One record has compatibility data but few/no active reservations
 * - Another record has many active reservations but no compatibility data
 *
 * This copies the compatibility data to the record that's actually being used.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TENANT_ID = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

async function copyCompatibilityToActivePets() {
  console.log('🔍 Finding pets with mismatched compatibility data...\n');

  try {
    // Get all unique pet names
    const petNames = await prisma.$queryRaw`
      SELECT DISTINCT name
      FROM pets
      WHERE "tenantId" = ${TENANT_ID}
        AND "isActive" = true
      ORDER BY name
    `;

    let totalCopied = 0;
    let totalDeactivated = 0;

    for (const { name } of petNames) {
      // Get all active records for this pet name
      const pets = await prisma.pet.findMany({
        where: {
          name: name,
          tenantId: TENANT_ID,
          isActive: true,
        },
        include: {
          owner: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          reservations: {
            where: {
              status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
            },
            select: { id: true },
          },
        },
      });

      if (pets.length <= 1) continue;

      // Find records with compatibility data
      const petsWithData = pets.filter((p) => p.playgroupCompatibility);

      // Find records without compatibility data but with active reservations
      const petsWithoutData = pets.filter(
        (p) => !p.playgroupCompatibility && p.reservations.length > 0
      );

      if (petsWithData.length === 0 || petsWithoutData.length === 0) continue;

      // For each pet without data, try to find a matching one with data
      for (const petWithoutData of petsWithoutData) {
        // Try to find exact customer match first
        let matchingPet = petsWithData.find(
          (p) => p.customerId === petWithoutData.customerId
        );

        // If no exact match, use any pet with data (same name, likely same dog)
        if (!matchingPet && petsWithData.length > 0) {
          matchingPet = petsWithData[0];
        }

        if (!matchingPet) continue;

        console.log(`\n📝 ${name}`);
        console.log(
          `   Customer: ${petWithoutData.owner.firstName} ${petWithoutData.owner.lastName}`
        );
        console.log(
          `   Active reservations: ${petWithoutData.reservations.length}`
        );
        console.log(
          `   Copying playgroup: ${matchingPet.playgroupCompatibility}`
        );
        console.log(`   From pet: ${matchingPet.id}`);
        console.log(`   To pet: ${petWithoutData.id}`);

        // Copy compatibility data
        await prisma.pet.update({
          where: { id: petWithoutData.id },
          data: {
            playgroupCompatibility: matchingPet.playgroupCompatibility,
            specialRequirements: matchingPet.specialRequirements || [],
            aggressionFlags: matchingPet.aggressionFlags || [],
            healthFlags: matchingPet.healthFlags || [],
            behaviorFlags: matchingPet.behaviorFlags || [],
            compatibilityNotes: matchingPet.compatibilityNotes,
            groomingPreferences: matchingPet.groomingPreferences,
            staffRequirements: matchingPet.staffRequirements,
          },
        });

        totalCopied++;

        // If the source pet has no active reservations, deactivate it
        if (matchingPet.reservations.length === 0) {
          await prisma.pet.update({
            where: { id: matchingPet.id },
            data: {
              isActive: false,
              deactivationReason: `Duplicate - data copied to ${petWithoutData.id}`,
            },
          });
          totalDeactivated++;
          console.log(`   🗑️ Deactivated source pet (no active reservations)`);
        }
      }
    }

    console.log('\n✅ Copy Complete!');
    console.log(`   📊 Total pets updated: ${totalCopied}`);
    console.log(`   🗑️ Total duplicates deactivated: ${totalDeactivated}`);

    // Show some statistics
    console.log('\n📊 Final Statistics:');
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_active_pets,
        COUNT(CASE WHEN "playgroupCompatibility" IS NOT NULL THEN 1 END) as with_playgroup
      FROM pets
      WHERE "tenantId" = ${TENANT_ID}
        AND "isActive" = true
    `;

    console.log(`   Active pets: ${stats[0].total_active_pets}`);
    console.log(`   With playgroup: ${stats[0].with_playgroup}`);

    // Show pets with active reservations but no playgroup
    const missingData = await prisma.$queryRaw`
      SELECT p.name, c."firstName", c."lastName", COUNT(r.id) as active_reservations
      FROM pets p
      JOIN customers c ON p."customerId" = c.id
      LEFT JOIN reservations r ON r."petId" = p.id 
        AND r.status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
      WHERE p."tenantId" = ${TENANT_ID}
        AND p."isActive" = true
        AND p."playgroupCompatibility" IS NULL
      GROUP BY p.id, p.name, c."firstName", c."lastName"
      HAVING COUNT(r.id) > 0
      ORDER BY COUNT(r.id) DESC
      LIMIT 10
    `;

    if (missingData.length > 0) {
      console.log('\n⚠️ Pets with active reservations but no playgroup data:');
      missingData.forEach((pet) => {
        console.log(
          `   ${pet.name} (${pet.firstName} ${pet.lastName}): ${pet.active_reservations} reservations`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error during copy:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
copyCompatibilityToActivePets()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
