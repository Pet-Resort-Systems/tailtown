import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStaffStatus() {
  try {
    console.log('🔍 Checking staff accounts...\n');

    // Get all staff accounts
    const allStaff = await prisma.staff.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        tenantId: true,
      },
    });

    console.log(`Found ${allStaff.length} staff accounts:\n`);

    allStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email})`);
      console.log(`   Role: ${staff.role}`);
      console.log(`   Status: ${staff.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Tenant: ${staff.tenantId}`);
      console.log('');
    });

    // Find inactive accounts
    const inactiveStaff = allStaff.filter(s => !s.isActive);

    if (inactiveStaff.length === 0) {
      console.log('✅ All staff accounts are active!');
      return;
    }

    console.log(`\n⚠️  Found ${inactiveStaff.length} inactive account(s)\n`);

    // Activate all inactive accounts
    console.log('🔧 Activating all inactive accounts...\n');

    for (const staff of inactiveStaff) {
      await prisma.staff.update({
        where: { id: staff.id },
        data: { isActive: true },
      });

      console.log(`✅ Activated: ${staff.firstName} ${staff.lastName} (${staff.email})`);
    }

    console.log('\n✅ All staff accounts are now active!');
    console.log('\n💡 Please log out and log back in to see the updated status.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStaffStatus();
