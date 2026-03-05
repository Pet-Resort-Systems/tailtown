/**
 * Fix Vaccine Key Capitalization
 *
 * This script fixes the capitalization of vaccine keys to match frontend expectations.
 * The frontend VaccinationStatus component expects capitalized keys:
 * - Rabies (not rabies)
 * - DHPP (not dhpp)
 * - Bordetella (not bordetella)
 * - FVRCP (not fvrcp)
 *
 * This ensures the vaccination data displays correctly in the UI.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixVaccineKeyCapitalization() {
  console.log("Starting vaccine key capitalization fix...\n");

  // Get all pets with vaccination data
  const allPets = await prisma.pet.findMany({
    include: {
      owner: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const petsWithLowercaseKeys = allPets.filter((pet) => {
    const hasLowercaseStatus =
      pet.vaccinationStatus &&
      (pet.vaccinationStatus.rabies ||
        pet.vaccinationStatus.dhpp ||
        pet.vaccinationStatus.bordetella ||
        pet.vaccinationStatus.fvrcp);
    const hasLowercaseExpirations =
      pet.vaccineExpirations &&
      (pet.vaccineExpirations.rabies ||
        pet.vaccineExpirations.dhpp ||
        pet.vaccineExpirations.bordetella ||
        pet.vaccineExpirations.fvrcp);
    return hasLowercaseStatus || hasLowercaseExpirations;
  });

  console.log(
    `Found ${petsWithLowercaseKeys.length} pets with lowercase vaccine keys\n`
  );

  let updatedCount = 0;
  let errorCount = 0;

  for (const pet of petsWithLowercaseKeys) {
    try {
      const newVaccinationStatus = { ...(pet.vaccinationStatus || {}) };
      const newVaccineExpirations = { ...(pet.vaccineExpirations || {}) };

      let updated = false;

      // Map lowercase keys to capitalized keys
      const keyMap = {
        rabies: "Rabies",
        dhpp: "DHPP",
        bordetella: "Bordetella",
        fvrcp: "FVRCP",
      };

      // Fix vaccinationStatus keys
      Object.entries(keyMap).forEach(([lowercase, capitalized]) => {
        if (newVaccinationStatus[lowercase]) {
          newVaccinationStatus[capitalized] = newVaccinationStatus[lowercase];
          delete newVaccinationStatus[lowercase];
          updated = true;
        }
      });

      // Fix vaccineExpirations keys
      Object.entries(keyMap).forEach(([lowercase, capitalized]) => {
        if (newVaccineExpirations[lowercase]) {
          newVaccineExpirations[capitalized] = newVaccineExpirations[lowercase];
          delete newVaccineExpirations[lowercase];
          updated = true;
        }
      });

      if (updated) {
        // Update the pet
        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            vaccinationStatus: newVaccinationStatus,
            vaccineExpirations: newVaccineExpirations,
          },
        });

        updatedCount++;
        console.log(
          `✓ Updated ${pet.name} (${pet.owner.lastName}) - ${pet.type}`
        );
      }
    } catch (error) {
      errorCount++;
      console.error(
        `✗ Error updating ${pet.name} (${pet.owner.lastName}):`,
        error.message
      );
    }
  }

  console.log("\n=== Summary ===");
  console.log(
    `Total pets with lowercase keys: ${petsWithLowercaseKeys.length}`
  );
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);

  await prisma.$disconnect();
}

fixVaccineKeyCapitalization().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
