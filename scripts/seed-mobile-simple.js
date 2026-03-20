const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMobileData() {
  console.log('🔧 Seeding mobile test data (simple)...\n');

  const tenantId = '06d09e08-fe1f-4feb-89f8-c3b619026ba9'; // Rainy Day's Inn

  try {
    // Get staff member
    const staff = await prisma.staff.findFirst({
      where: {
        tenantId,
        email: 'sarah.mitchell@rainytest.com',
      },
    });

    if (!staff) {
      console.log('❌ Staff member not found.');
      return;
    }

    console.log(`✅ Using staff: ${staff.firstName} ${staff.lastName}\n`);

    // Create staff schedules for today
    console.log('📅 Creating staff schedules...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete existing schedules for today
    await prisma.staffSchedule.deleteMany({
      where: {
        tenantId,
        staffId: staff.id,
        date: today,
      },
    });

    // Morning shift
    await prisma.staffSchedule.create({
      data: {
        tenantId,
        staffId: staff.id,
        date: today,
        startTime: '08:00',
        endTime: '12:00',
        role: 'Kennel Attendant',
        location: 'Main Building',
        status: 'SCHEDULED',
      },
    });

    // Lunch break
    await prisma.staffSchedule.create({
      data: {
        tenantId,
        staffId: staff.id,
        date: today,
        startTime: '12:00',
        endTime: '13:00',
        role: 'Break',
        location: '',
        status: 'SCHEDULED',
      },
    });

    // Afternoon shift
    await prisma.staffSchedule.create({
      data: {
        tenantId,
        staffId: staff.id,
        date: today,
        startTime: '13:00',
        endTime: '17:00',
        role: 'Kennel Attendant',
        location: 'Main Building',
        status: 'SCHEDULED',
      },
    });

    console.log('✅ Created 3 schedule entries\n');

    console.log('🎉 Mobile test data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Staff: ${staff.firstName} ${staff.lastName}`);
    console.log(`   Schedule Entries: 3 (today)`);
    console.log(`\n✅ Login as sarah.mitchell@rainytest.com to test!`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMobileData().catch((error) => {
  console.error(error);
  process.exit(1);
});
