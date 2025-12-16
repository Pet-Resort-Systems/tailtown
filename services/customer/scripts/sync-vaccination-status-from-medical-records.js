/**
 * Sync Vaccination Status from Medical Records
 *
 * This script syncs the vaccinationStatus and vaccineExpirations fields
 * with the data from medical records. The pet details form reads from
 * medical records, but the vaccination badge reads from vaccinationStatus,
 * causing a mismatch.
 *
 * This ensures both sources show the same data.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function syncVaccinationStatus() {
  console.log("Starting vaccination status sync from medical records...\n");

  // Get all pets with vaccination medical records
  const pets = await prisma.pet.findMany({
    include: {
      owner: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      medicalRecords: {
        where: {
          recordType: "VACCINATION",
        },
      },
    },
  });

  const petsWithVaccinations = pets.filter(
    (pet) => pet.medicalRecords.length > 0
  );
  console.log(
    `Found ${petsWithVaccinations.length} pets with vaccination medical records\n`
  );

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const pet of petsWithVaccinations) {
    try {
      const vaccinationStatus = { ...(pet.vaccinationStatus || {}) };
      const vaccineExpirations = { ...(pet.vaccineExpirations || {}) };

      // Map vaccine descriptions to field names
      const vaccineMap = {
        "Rabies vaccination": "Rabies",
        "DHPP vaccination": "DHPP",
        "Bordetella vaccination": "Bordetella",
        "FVRCP vaccination": "FVRCP",
        "Canine Influenza vaccination": "Influenza",
        "Feline Leukemia vaccination": "Lepto",
      };

      let updated = false;

      pet.medicalRecords.forEach((record) => {
        const vaccineName = vaccineMap[record.description];
        if (vaccineName && record.expirationDate) {
          const expDate = new Date(record.expirationDate);
          expDate.setHours(0, 0, 0, 0);
          const status = expDate >= today ? "CURRENT" : "EXPIRED";

          // Update vaccinationStatus
          vaccinationStatus[vaccineName] = {
            status: status,
            expiration: record.expirationDate.toISOString(),
            lastGiven: record.recordDate
              ? record.recordDate.toISOString()
              : undefined,
          };

          // Update vaccineExpirations
          vaccineExpirations[vaccineName] = record.expirationDate.toISOString();

          updated = true;
        }
      });

      if (updated) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            vaccinationStatus,
            vaccineExpirations,
          },
        });

        updatedCount++;
        console.log(
          `✓ Updated ${pet.name} (${pet.owner.lastName}) - ${pet.type}`
        );
      } else {
        skippedCount++;
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
    `Total pets with vaccination records: ${petsWithVaccinations.length}`
  );
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Skipped (no mappable vaccines): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  await prisma.$disconnect();
}

syncVaccinationStatus().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
