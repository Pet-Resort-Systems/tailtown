/**
 * Assign Kennels to Imported Reservations by Service Type
 *
 * This script distributes imported Gingr reservations across available kennels
 * based on the service type (VIP, Standard, etc.) and date availability.
 *
 * Usage:
 *   node assign-kennels-by-service.js --dryRun   # Preview changes
 *   node assign-kennels-by-service.js            # Apply changes
 */

import { PrismaClient } from './src/generated/prisma/client.js';
const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dryRun');

async function assignKennelsByService() {
  try {
    console.log(
      isDryRun
        ? '🔍 DRY RUN MODE - No changes will be made\n'
        : '⚡ LIVE MODE - Changes will be applied\n'
    );

    // Get all resources grouped by type
    console.log('Fetching available resources...');
    const vipSuites = await prisma.resource.findMany({
      where: { tenantId: 'dev', type: 'VIP_SUITE', isActive: true },
      orderBy: { name: 'asc' },
    });

    const standardPlusSuites = await prisma.resource.findMany({
      where: { tenantId: 'dev', type: 'STANDARD_PLUS_SUITE', isActive: true },
      orderBy: { name: 'asc' },
    });

    const standardSuites = await prisma.resource.findMany({
      where: { tenantId: 'dev', type: 'STANDARD_SUITE', isActive: true },
      orderBy: { name: 'asc' },
    });

    console.log(`Found ${vipSuites.length} VIP suites`);
    console.log(`Found ${standardPlusSuites.length} Standard Plus suites`);
    console.log(`Found ${standardSuites.length} Standard suites`);

    if (vipSuites.length === 0 && standardSuites.length === 0) {
      console.error('❌ No suites found! Please create resources first.');
      process.exit(1);
    }

    // Get all imported reservations (those with externalId from Gingr)
    console.log('\nFetching imported reservations...');
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId: 'dev',
        externalId: { not: null },
      },
      include: {
        service: true,
        pet: true,
      },
      orderBy: { startDate: 'asc' },
    });

    console.log(
      `Found ${reservations.length} imported reservations to process\n`
    );

    if (reservations.length === 0) {
      console.log('✅ No reservations to process');
      return;
    }

    // Track assignments per kennel to distribute evenly
    const kennelUsage = {};

    let updated = 0;
    let skipped = 0;
    const changes = [];

    for (const reservation of reservations) {
      let targetResource = null;
      let reason = '';

      // Determine which kennel type based on service name
      const serviceName = reservation.service.name.toLowerCase();

      if (serviceName.includes('vip')) {
        // VIP services → VIP suites
        if (vipSuites.length > 0) {
          // Round-robin assignment
          const index = (kennelUsage['VIP'] || 0) % vipSuites.length;
          targetResource = vipSuites[index];
          kennelUsage['VIP'] = (kennelUsage['VIP'] || 0) + 1;
          reason = 'VIP service → VIP suite';
        }
      } else if (
        serviceName.includes('plus') ||
        serviceName.includes('premium')
      ) {
        // Plus/Premium services → Standard Plus suites
        if (standardPlusSuites.length > 0) {
          const index = (kennelUsage['PLUS'] || 0) % standardPlusSuites.length;
          targetResource = standardPlusSuites[index];
          kennelUsage['PLUS'] = (kennelUsage['PLUS'] || 0) + 1;
          reason = 'Plus service → Standard Plus suite';
        } else if (standardSuites.length > 0) {
          // Fallback to standard
          const index = (kennelUsage['STANDARD'] || 0) % standardSuites.length;
          targetResource = standardSuites[index];
          kennelUsage['STANDARD'] = (kennelUsage['STANDARD'] || 0) + 1;
          reason = 'Plus service → Standard suite (no Plus available)';
        }
      } else if (
        serviceName.includes('boarding') ||
        serviceName.includes('suite')
      ) {
        // Standard boarding → Standard suites
        if (standardSuites.length > 0) {
          const index = (kennelUsage['STANDARD'] || 0) % standardSuites.length;
          targetResource = standardSuites[index];
          kennelUsage['STANDARD'] = (kennelUsage['STANDARD'] || 0) + 1;
          reason = 'Boarding service → Standard suite';
        }
      } else if (serviceName.includes('day') || serviceName.includes('camp')) {
        // Day services don't need kennel assignment
        skipped++;
        continue;
      } else {
        // Default to standard suites for unknown types
        if (standardSuites.length > 0) {
          const index = (kennelUsage['STANDARD'] || 0) % standardSuites.length;
          targetResource = standardSuites[index];
          kennelUsage['STANDARD'] = (kennelUsage['STANDARD'] || 0) + 1;
          reason = 'Unknown service → Standard suite (default)';
        }
      }

      if (targetResource) {
        changes.push({
          reservationId: reservation.id,
          externalId: reservation.externalId,
          customer: `${reservation.pet.name}`,
          service: reservation.service.name,
          dates: `${reservation.startDate.toISOString().split('T')[0]} to ${reservation.endDate.toISOString().split('T')[0]}`,
          oldResource: 'A01',
          newResource: targetResource.name,
          reason,
        });

        if (!isDryRun) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { resourceId: targetResource.id },
          });
        }

        updated++;
      } else {
        skipped++;
      }
    }

    // Print summary
    console.log('═'.repeat(80));
    console.log('SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total reservations processed: ${reservations.length}`);
    console.log(`Assignments made: ${updated}`);
    console.log(`Skipped (day services): ${skipped}`);

    console.log('\nKennel Usage Distribution:');
    for (const [type, count] of Object.entries(kennelUsage)) {
      console.log(`  ${type}: ${count} reservations`);
    }

    if (changes.length > 0 && changes.length <= 20) {
      console.log('\nChanges:');
      changes.forEach((change, i) => {
        console.log(`  ${i + 1}. ${change.customer} - ${change.service}`);
        console.log(`     ${change.dates}`);
        console.log(
          `     ${change.oldResource} → ${change.newResource} (${change.reason})`
        );
      });
    } else if (changes.length > 20) {
      console.log('\nSample Changes (first 10):');
      changes.slice(0, 10).forEach((change, i) => {
        console.log(
          `  ${i + 1}. ${change.customer}: ${change.oldResource} → ${change.newResource}`
        );
      });
      console.log(`  ... and ${changes.length - 10} more`);
    }

    if (isDryRun) {
      console.log('\n💡 This was a DRY RUN. No changes were made.');
      console.log('   Run without --dryRun to apply these changes.');
    } else {
      console.log('\n✅ Changes applied successfully!');
      console.log('   Check the calendar to verify assignments.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

assignKennelsByService();
