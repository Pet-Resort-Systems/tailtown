/**
 * Fix Unknown Vaccine Records
 *
 * This script fixes pets that have "Unknown" vaccine records from the Gingr import.
 * It maps "Unknown" vaccines to the proper required vaccines based on pet type:
 * - Dogs: rabies, dhpp, bordetella
 * - Cats: rabies, fvrcp
 *
 * Strategy:
 * 1. Find all pets with "Unknown" vaccine records
 * 2. For each pet, replace "Unknown" with the primary required vaccine (rabies)
 * 3. Keep the same expiration date and status
 *
 * This ensures pets with current vaccines show as compliant instead of "3 Due"
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixUnknownVaccines() {
  console.log("Starting Unknown vaccine fix...\n");

  // Get all pets with Unknown vaccine records
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

  const petsWithUnknown = allPets.filter((pet) => {
    return (
      (pet.vaccinationStatus && pet.vaccinationStatus.Unknown) ||
      (pet.vaccineExpirations && pet.vaccineExpirations.Unknown)
    );
  });

  console.log(
    `Found ${petsWithUnknown.length} pets with Unknown vaccine records\n`
  );

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const pet of petsWithUnknown) {
    try {
      const unknownExpiration = pet.vaccineExpirations?.Unknown;
      const unknownStatus = pet.vaccinationStatus?.Unknown;

      if (!unknownExpiration && !unknownStatus) {
        skippedCount++;
        continue;
      }

      // Determine the status based on expiration date
      let status = "CURRENT";
      if (unknownExpiration) {
        const expDate = new Date(unknownExpiration);
        expDate.setHours(0, 0, 0, 0);
        status = expDate >= today ? "CURRENT" : "EXPIRED";
      } else if (unknownStatus) {
        status = unknownStatus === "current" ? "CURRENT" : "EXPIRED";
      }

      // Map to Rabies (capitalized to match frontend expectations)
      const newVaccinationStatus = { ...(pet.vaccinationStatus || {}) };
      const newVaccineExpirations = { ...(pet.vaccineExpirations || {}) };

      // Remove Unknown entries
      delete newVaccinationStatus.Unknown;
      delete newVaccineExpirations.Unknown;

      // Add Rabies with the same data (using capitalized key)
      if (unknownExpiration) {
        newVaccineExpirations.Rabies = unknownExpiration;
        newVaccinationStatus.Rabies = {
          status: status,
          expiration: unknownExpiration,
        };
      } else if (unknownStatus) {
        newVaccinationStatus.Rabies = unknownStatus;
      }

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
        `✓ Updated ${pet.name} (${pet.owner.lastName}) - ${
          pet.type
        } - ${status} - ${unknownExpiration || unknownStatus}`
      );
    } catch (error) {
      errorCount++;
      console.error(
        `✗ Error updating ${pet.name} (${pet.owner.lastName}):`,
        error.message
      );
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total pets with Unknown vaccines: ${petsWithUnknown.length}`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  await prisma.$disconnect();
}

fixUnknownVaccines().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
