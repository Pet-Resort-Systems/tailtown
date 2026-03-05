/**
 * Fix Reservations Pointing to Inactive Pets
 *
 * Finds reservations that point to inactive pet records and updates them
 * to point to the correct active pet record (matching name + customer).
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TENANT_ID = "b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05";

async function fixReservationsWithInactivePets() {
  console.log("🔍 Finding reservations pointing to inactive pets...\n");

  try {
    // Find all active/pending reservations pointing to inactive pets
    const problematicReservations = await prisma.reservation.findMany({
      where: {
        tenantId: TENANT_ID,
        status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
        pet: {
          isActive: false,
        },
      },
      include: {
        pet: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    console.log(
      `📊 Found ${problematicReservations.length} reservations pointing to inactive pets\n`
    );

    let totalFixed = 0;
    let totalNotFound = 0;

    for (const reservation of problematicReservations) {
      const inactivePet = reservation.pet;

      // Find the active pet with the same name and customer
      const activePet = await prisma.pet.findFirst({
        where: {
          name: inactivePet.name,
          customerId: inactivePet.customerId,
          isActive: true,
          tenantId: TENANT_ID,
        },
      });

      if (activePet) {
        console.log(
          `📝 ${inactivePet.name} (${inactivePet.owner.firstName} ${inactivePet.owner.lastName})`
        );
        console.log(`   Reservation: ${reservation.id}`);
        console.log(`   From inactive pet: ${inactivePet.id}`);
        console.log(`   To active pet: ${activePet.id}`);
        console.log(
          `   Playgroup: ${activePet.playgroupCompatibility || "none"}`
        );

        // Update the reservation to point to the active pet
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { petId: activePet.id },
        });

        totalFixed++;
      } else {
        console.log(
          `⚠️ No active pet found for: ${inactivePet.name} (${inactivePet.owner.firstName} ${inactivePet.owner.lastName})`
        );
        console.log(`   Reservation: ${reservation.id}`);
        console.log(`   Inactive pet: ${inactivePet.id}`);
        totalNotFound++;
      }
    }

    console.log("\n✅ Fix Complete!");
    console.log(`   📊 Total reservations fixed: ${totalFixed}`);
    console.log(`   ⚠️ Reservations without active pet: ${totalNotFound}`);

    // Verification
    console.log("\n📊 Verification:");
    const remainingIssues = await prisma.reservation.count({
      where: {
        tenantId: TENANT_ID,
        status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
        pet: {
          isActive: false,
        },
      },
    });

    console.log(
      `   Remaining reservations with inactive pets: ${remainingIssues}`
    );
  } catch (error) {
    console.error("❌ Error during fix:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixReservationsWithInactivePets()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
