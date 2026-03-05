import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllStaff() {
  try {
    console.log('📋 All Staff Accounts:\n');

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

    if (allStaff.length === 0) {
      console.log('❌ No staff accounts found!');
      return;
    }

    allStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ID: ${staff.id}`);
      console.log(`   Name: ${staff.firstName} ${staff.lastName}`);
      console.log(`   Email: ${staff.email}`);
      console.log(`   Role: ${staff.role}`);
      console.log(`   Status: ${staff.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Tenant: ${staff.tenantId}`);
      console.log('');
    });

    console.log(`Total: ${allStaff.length} staff account(s)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllStaff();
