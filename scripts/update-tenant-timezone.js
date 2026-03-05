/**
 * Update tenant timezone
 * 
 * Usage: node scripts/update-tenant-timezone.js <subdomain> <timezone>
 * Example: node scripts/update-tenant-timezone.js tailtown America/Denver
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTenantTimezone() {
  const subdomain = process.argv[2];
  const timezone = process.argv[3];

  if (!subdomain || !timezone) {
    console.log('❌ Usage: node scripts/update-tenant-timezone.js <subdomain> <timezone>');
    console.log('\nExample: node scripts/update-tenant-timezone.js tailtown America/Denver');
    console.log('\nCommon timezones:');
    console.log('  - America/New_York (Eastern)');
    console.log('  - America/Chicago (Central)');
    console.log('  - America/Denver (Mountain)');
    console.log('  - America/Los_Angeles (Pacific)');
    process.exit(1);
  }

  try {
    console.log(`🔍 Looking for tenant: ${subdomain}...\n`);
    
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain }
    });

    if (!tenant) {
      console.log(`❌ Tenant '${subdomain}' not found!`);
      process.exit(1);
    }

    console.log(`✅ Found tenant: ${tenant.businessName}`);
    console.log(`   Current timezone: ${tenant.timezone}`);
    console.log(`   New timezone: ${timezone}\n`);

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { timezone }
    });

    console.log(`✅ Successfully updated timezone to: ${updated.timezone}`);
    console.log('\n💡 The apps/frontend will use this timezone on next page load!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateTenantTimezone();
