/**
 * Fix Cross-Customer Duplicate Pets with Split Compatibility Data
 *
 * This script handles cases where:
 * - Same pet name exists multiple times (different customers or same customer)
 * - One duplicate has playgroup compatibility data
 * - Other duplicate(s) have active reservations but no compatibility data
 *
 * Solution: Copy compatibility data to the record with the most active reservations
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";

async function fixCrossCustomerDuplicates() {
  console.log("🔍 Finding pets with split compatibility data...\n");

  try {
    // Find all pet names that have multiple records where some have playgroup data and some don't
    const problematicPets = await prisma.$queryRaw`
      WITH pet_groups AS (
        SELECT 
          name,
          "customerId",
          COUNT(*) as record_count,
          COUNT(CASE WHEN "playgroupCompatibility" IS NOT NULL THEN 1 END) as with_playgroup,
          COUNT(CASE WHEN "playgroupCompatibility" IS NULL THEN 1 END) as without_playgroup
        FROM pets
        WHERE "tenantId" = ${TENANT_ID}
          AND "isActive" = true
        GROUP BY name, "customerId"
      )
      SELECT name, "customerId"
      FROM pet_groups
      WHERE record_count > 1
        AND with_playgroup > 0
        AND without_playgroup > 0
    `;

    console.log(
      `📊 Found ${problematicPets.length} pet name/customer combinations with split data\n`
    );

    let totalFixed = 0;
    let totalReservationsMoved = 0;

    for (const problem of problematicPets) {
      // Get all pet records for this name/customer combination
      const pets = await prisma.pet.findMany({
        where: {
          name: problem.name,
          customerId: problem.customerId,
          isActive: true,
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              reservations: {
                where: {
                  status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
                },
              },
            },
          },
        },
      });

      // Find the record with playgroup data
      const petWithData = pets.find((p) => p.playgroupCompatibility);

      // Find the record with the most active reservations
      const petWithMostReservations = pets.reduce((best, current) => {
        return current._count.reservations > best._count.reservations
          ? current
          : best;
      });

      if (!petWithData || petWithData.id === petWithMostReservations.id) {
        // Already correct or no data to copy
        continue;
      }

      console.log(
        `\n📝 ${problem.name} (${pets[0].customer.firstName} ${pets[0].customer.lastName})`
      );
      console.log(
        `   Record with data: ${petWithData.id} (${petWithData._count.reservations} reservations)`
      );
      console.log(
        `   Record with most reservations: ${petWithMostReservations.id} (${petWithMostReservations._count.reservations} reservations)`
      );
      console.log(`   Playgroup: ${petWithData.playgroupCompatibility}`);

      // Copy compatibility data to the record with most reservations
      await prisma.pet.update({
        where: { id: petWithMostReservations.id },
        data: {
          playgroupCompatibility: petWithData.playgroupCompatibility,
          specialRequirements: petWithData.specialRequirements || [],
          aggressionFlags: petWithData.aggressionFlags || [],
          healthFlags: petWithData.healthFlags || [],
          behaviorFlags: petWithData.behaviorFlags || [],
          compatibilityNotes: petWithData.compatibilityNotes,
          groomingPreferences: petWithData.groomingPreferences,
          staffRequirements: petWithData.staffRequirements,
        },
      });

      // Move any reservations from the data record to the main record
      if (petWithData._count.reservations > 0) {
        const moveResult = await prisma.reservation.updateMany({
          where: { petId: petWithData.id },
          data: { petId: petWithMostReservations.id },
        });
        totalReservationsMoved += moveResult.count;
        console.log(`   📋 Moved ${moveResult.count} reservations`);
      }

      // Deactivate the duplicate with data (now that it's been copied)
      await prisma.pet.update({
        where: { id: petWithData.id },
        data: {
          isActive: false,
          deactivationReason: `Duplicate - data merged into ${petWithMostReservations.id}`,
        },
      });

      console.log(`   ✅ Copied compatibility data and deactivated duplicate`);
      totalFixed++;
    }

    console.log("\n✅ Fix Complete!");
    console.log(`   📊 Total pets fixed: ${totalFixed}`);
    console.log(`   📋 Total reservations moved: ${totalReservationsMoved}`);

    // Verification
    console.log("\n📊 Verification - Checking for remaining issues:");
    const remainingIssues = await prisma.$queryRaw`
      WITH pet_groups AS (
        SELECT 
          name,
          "customerId",
          COUNT(*) as record_count,
          COUNT(CASE WHEN "playgroupCompatibility" IS NOT NULL THEN 1 END) as with_playgroup,
          COUNT(CASE WHEN "playgroupCompatibility" IS NULL THEN 1 END) as without_playgroup
        FROM pets
        WHERE "tenantId" = ${TENANT_ID}
          AND "isActive" = true
        GROUP BY name, "customerId"
      )
      SELECT COUNT(*) as count
      FROM pet_groups
      WHERE record_count > 1
        AND with_playgroup > 0
        AND without_playgroup > 0
    `;

    console.log(`   Remaining split data issues: ${remainingIssues[0].count}`);
  } catch (error) {
    console.error("❌ Error during fix:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixCrossCustomerDuplicates()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
