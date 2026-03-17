/**
 * Fix Reservation Times - Correct timezone offset for Gingr imports
 *
 * Problem: Reservations imported from Gingr have incorrect times due to timezone conversion
 * - Gingr sends times in Mountain Time without timezone info
 * - Old code treated them as UTC, causing 7-hour offset
 * - Check-ins at 12:30 PM MST were stored as 12:30 AM MST (5:30 AM UTC instead of 7:30 PM UTC)
 *
 * Solution: Add 7 hours to all reservation times that came from Gingr (have externalId)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixReservationTimes() {
  console.log('🔧 Starting reservation time fix...\n');

  try {
    // Get all reservations that were imported from Gingr (have externalId)
    const reservations = await prisma.reservation.findMany({
      where: {
        externalId: {
          not: null,
        },
      },
      select: {
        id: true,
        externalId: true,
        startDate: true,
        endDate: true,
        tenantId: true,
      },
    });

    console.log(
      `Found ${reservations.length} Gingr-imported reservations to fix\n`
    );

    let fixedCount = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < reservations.length; i++) {
      const reservation = reservations[i];

      if (i > 0 && i % BATCH_SIZE === 0) {
        console.log(
          `Progress: ${i}/${reservations.length} (${fixedCount} fixed)`
        );
      }

      try {
        // Add 7 hours to both start and end dates
        const newStartDate = new Date(reservation.startDate);
        newStartDate.setHours(newStartDate.getHours() + 7);

        const newEndDate = new Date(reservation.endDate);
        newEndDate.setHours(newEndDate.getHours() + 7);

        // Update the reservation
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
          },
        });

        fixedCount++;

        // Log first few for verification
        if (i < 5) {
          console.log(`\nFixed reservation ${reservation.externalId}:`);
          console.log(`  Old start: ${reservation.startDate.toISOString()}`);
          console.log(`  New start: ${newStartDate.toISOString()}`);
          console.log(`  Old end:   ${reservation.endDate.toISOString()}`);
          console.log(`  New end:   ${newEndDate.toISOString()}`);
        }
      } catch (error) {
        console.error(
          `Error fixing reservation ${reservation.id}:`,
          error.message
        );
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} reservations`);
    console.log('\n🎉 Reservation time fix complete!');
  } catch (error) {
    console.error('❌ Error during fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixReservationTimes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
