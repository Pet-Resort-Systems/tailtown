// @ts-nocheck
// NOTE: This script references Customer/Pet models that have been removed from
// the reservation service schema. Run against customer service database if needed.
import { prisma } from '../config/prisma';

async function fixTenantIds() {
  console.log('Checking tenant IDs in database...\n');

  try {
    // Check current tenant IDs
    const reservations = await prisma.reservation.findMany({
      select: {
        tenantId: true,
      },
      distinct: ['tenantId'],
    });

    console.log(
      'Current tenant IDs in reservations:',
      reservations.map((r) => r.tenantId)
    );

    // Count reservations per tenant
    const counts = (await prisma.$queryRaw`
      SELECT "tenantId", COUNT(*) as count 
      FROM reservations 
      GROUP BY "tenantId"
    `) as any[];

    console.log('\nReservation counts by tenant:');
    counts.forEach((row: any) => {
      console.log(`  ${row.tenantId}: ${row.count} reservations`);
    });

    // Update all non-'dev' tenant IDs to 'dev'
    const updateResult = await prisma.reservation.updateMany({
      where: {
        tenantId: {
          not: 'dev',
        },
      },
      data: {
        tenantId: 'dev',
      },
    });

    console.log(
      `\n✓ Updated ${updateResult.count} reservations to use 'dev' tenant`
    );

    // Update customers
    const customerUpdate = await prisma.customer.updateMany({
      where: {
        tenantId: {
          not: 'dev',
        },
      },
      data: {
        tenantId: 'dev',
      },
    });

    console.log(
      `✓ Updated ${customerUpdate.count} customers to use 'dev' tenant`
    );

    // Update pets
    const petUpdate = await prisma.pet.updateMany({
      where: {
        tenantId: {
          not: 'dev',
        },
      },
      data: {
        tenantId: 'dev',
      },
    });

    console.log(`✓ Updated ${petUpdate.count} pets to use 'dev' tenant`);

    // Update services
    const serviceUpdate = await prisma.service.updateMany({
      where: {
        tenantId: {
          not: 'dev',
        },
      },
      data: {
        tenantId: 'dev',
      },
    });

    console.log(
      `✓ Updated ${serviceUpdate.count} services to use 'dev' tenant`
    );

    console.log('\n✅ All tenant IDs fixed!');
  } catch (error) {
    console.error('Error fixing tenant IDs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTenantIds().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
