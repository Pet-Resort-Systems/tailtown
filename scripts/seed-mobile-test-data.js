const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMobileTestData() {
  console.log('🔧 Seeding mobile app test data...\n');

  const tenantId = '06d09e08-fe1f-4feb-89f8-c3b619026ba9'; // Rainy Day's Inn

  try {
    // Get or create a staff member
    let staff = await prisma.staff.findFirst({
      where: {
        tenantId,
        email: 'sarah.mitchell@rainytest.com',
      },
    });

    if (!staff) {
      console.log(
        '❌ Staff member not found. Please run seed-rainy-test-data.js first.'
      );
      return;
    }

    console.log(
      `✅ Using staff: ${staff.firstName} ${staff.lastName} (${staff.id})\n`
    );

    // Create checklist templates if they don't exist
    console.log('📋 Creating checklist templates...');

    const openingTemplate = await prisma.checklistTemplate.upsert({
      where: {
        id: 'opening-checklist-template',
      },
      update: {},
      create: {
        id: 'opening-checklist-template',
        tenantId,
        name: 'Opening Checklist',
        description: 'Daily opening procedures',
        area: 'KENNEL_CHECKIN',
        isActive: true,
        items: JSON.stringify([
          { id: '1', text: 'Unlock facility', required: true },
          { id: '2', text: 'Turn on lights', required: true },
          { id: '3', text: 'Check temperature controls', required: true },
          { id: '4', text: 'Prepare feeding stations', required: false },
          { id: '5', text: 'Check water systems', required: true },
          { id: '6', text: 'Review daily schedule', required: true },
          { id: '7', text: 'Stock supplies', required: false },
          { id: '8', text: 'Clean lobby area', required: true },
          { id: '9', text: 'Turn on music/TV', required: false },
          { id: '10', text: 'Check emergency equipment', required: true },
        ]),
        requiredForCompletion: JSON.stringify([
          '1',
          '2',
          '3',
          '5',
          '6',
          '8',
          '10',
        ]),
        estimatedMinutes: 30,
      },
    });

    const medicationTemplate = await prisma.checklistTemplate.upsert({
      where: {
        id: 'medication-round-template',
      },
      update: {},
      create: {
        id: 'medication-round-template',
        tenantId,
        name: 'Medication Round',
        description: 'Administer medications to pets',
        area: 'KENNEL_CHECKIN',
        isActive: true,
        items: JSON.stringify([
          { id: '1', text: 'Review medication schedule', required: true },
          { id: '2', text: 'Prepare medications', required: true },
          { id: '3', text: 'Administer morning meds', required: true },
          { id: '4', text: 'Document administration', required: true },
          { id: '5', text: 'Clean medication area', required: true },
        ]),
        requiredForCompletion: JSON.stringify(['1', '2', '3', '4', '5']),
        estimatedMinutes: 20,
      },
    });

    const feedingTemplate = await prisma.checklistTemplate.upsert({
      where: {
        id: 'feeding-schedule-template',
      },
      update: {},
      create: {
        id: 'feeding-schedule-template',
        tenantId,
        name: 'Feeding Schedule',
        description: 'Feed all pets according to schedule',
        area: 'KENNEL_CHECKIN',
        isActive: true,
        items: JSON.stringify([
          { id: '1', text: 'Prepare food bowls', required: true },
          { id: '2', text: 'Check dietary restrictions', required: true },
          { id: '3', text: 'Feed morning meals', required: true },
          { id: '4', text: 'Monitor eating', required: true },
          { id: '5', text: 'Clean feeding area', required: true },
          { id: '6', text: 'Refill water bowls', required: true },
        ]),
        requiredForCompletion: JSON.stringify(['1', '2', '3', '6']),
        estimatedMinutes: 45,
      },
    });

    console.log('✅ Created 3 checklist templates\n');

    // Create checklist instances
    console.log('📝 Creating checklist instances...');

    // Opening checklist - partially completed
    const openingInstance = await prisma.checklistInstance.create({
      data: {
        tenantId,
        templateId: openingTemplate.id,
        assignedToStaffId: staff.id,
        assignedToStaffName: `${staff.firstName} ${staff.lastName}`,
        status: 'IN_PROGRESS',
        items: JSON.stringify([
          { id: '1', text: 'Unlock facility', required: true, completed: true },
          { id: '2', text: 'Turn on lights', required: true, completed: true },
          {
            id: '3',
            text: 'Check temperature controls',
            required: true,
            completed: true,
          },
          {
            id: '4',
            text: 'Prepare feeding stations',
            required: false,
            completed: true,
          },
          {
            id: '5',
            text: 'Check water systems',
            required: true,
            completed: true,
          },
          {
            id: '6',
            text: 'Review daily schedule',
            required: true,
            completed: true,
          },
          { id: '7', text: 'Stock supplies', required: false, completed: true },
          {
            id: '8',
            text: 'Clean lobby area',
            required: true,
            completed: true,
          },
          {
            id: '9',
            text: 'Turn on music/TV',
            required: false,
            completed: false,
          },
          {
            id: '10',
            text: 'Check emergency equipment',
            required: true,
            completed: false,
          },
        ]),
        startedAt: new Date(),
      },
    });

    // Medication round - not started
    const medicationInstance = await prisma.checklistInstance.create({
      data: {
        tenantId,
        templateId: medicationTemplate.id,
        assignedToStaffId: staff.id,
        assignedToStaffName: `${staff.firstName} ${staff.lastName}`,
        status: 'PENDING',
        items: JSON.stringify([
          {
            id: '1',
            text: 'Review medication schedule',
            required: true,
            completed: false,
          },
          {
            id: '2',
            text: 'Prepare medications',
            required: true,
            completed: false,
          },
          {
            id: '3',
            text: 'Administer morning meds',
            required: true,
            completed: false,
          },
          {
            id: '4',
            text: 'Document administration',
            required: true,
            completed: false,
          },
          {
            id: '5',
            text: 'Clean medication area',
            required: true,
            completed: false,
          },
        ]),
      },
    });

    // Feeding schedule - partially completed
    const feedingInstance = await prisma.checklistInstance.create({
      data: {
        tenantId,
        templateId: feedingTemplate.id,
        assignedToStaffId: staff.id,
        assignedToStaffName: `${staff.firstName} ${staff.lastName}`,
        status: 'IN_PROGRESS',
        items: JSON.stringify([
          {
            id: '1',
            text: 'Prepare food bowls',
            required: true,
            completed: true,
          },
          {
            id: '2',
            text: 'Check dietary restrictions',
            required: true,
            completed: true,
          },
          {
            id: '3',
            text: 'Feed morning meals',
            required: true,
            completed: true,
          },
          { id: '4', text: 'Monitor eating', required: true, completed: true },
          {
            id: '5',
            text: 'Clean feeding area',
            required: true,
            completed: false,
          },
          {
            id: '6',
            text: 'Refill water bowls',
            required: true,
            completed: false,
          },
        ]),
        startedAt: new Date(),
      },
    });

    console.log('✅ Created 3 checklist instances\n');

    // Create staff schedules for today
    console.log('📅 Creating staff schedules...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    console.log(`   Checklist Templates: 3`);
    console.log(`   Checklist Instances: 3`);
    console.log(`   - Opening Checklist: 8/10 completed`);
    console.log(`   - Medication Round: 0/5 completed`);
    console.log(`   - Feeding Schedule: 4/6 completed`);
    console.log(`   Schedule Entries: 3`);
    console.log(`\n✅ Login as sarah.mitchell@rainytest.com to test!`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMobileTestData().catch((error) => {
  console.error(error);
  process.exit(1);
});
