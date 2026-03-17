/**
 * Seed Rainy Tenant with Test Data
 *
 * Creates:
 * - 10 test customers
 * - 10 test pets (1 per customer)
 * - 2 additional staff members
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const RAINY_TENANT_ID = '06d09e08-fe1f-4feb-89f8-c3b619026ba9';

// Test customers data
const testCustomers = [
  {
    firstName: 'Alice',
    lastName: 'Anderson',
    email: 'alice.anderson@rainytest.com',
    phone: '555-0101',
  },
  {
    firstName: 'Bob',
    lastName: 'Baker',
    email: 'bob.baker@rainytest.com',
    phone: '555-0102',
  },
  {
    firstName: 'Carol',
    lastName: 'Chen',
    email: 'carol.chen@rainytest.com',
    phone: '555-0103',
  },
  {
    firstName: 'David',
    lastName: 'Davis',
    email: 'david.davis@rainytest.com',
    phone: '555-0104',
  },
  {
    firstName: 'Emma',
    lastName: 'Evans',
    email: 'emma.evans@rainytest.com',
    phone: '555-0105',
  },
  {
    firstName: 'Frank',
    lastName: 'Foster',
    email: 'frank.foster@rainytest.com',
    phone: '555-0106',
  },
  {
    firstName: 'Grace',
    lastName: 'Garcia',
    email: 'grace.garcia@rainytest.com',
    phone: '555-0107',
  },
  {
    firstName: 'Henry',
    lastName: 'Harris',
    email: 'henry.harris@rainytest.com',
    phone: '555-0108',
  },
  {
    firstName: 'Iris',
    lastName: 'Iverson',
    email: 'iris.iverson@rainytest.com',
    phone: '555-0109',
  },
  {
    firstName: 'Jack',
    lastName: 'Johnson',
    email: 'jack.johnson@rainytest.com',
    phone: '555-0110',
  },
];

// Test pets data (matching customers)
// Calculate birthdate from age (years ago)
const getYearsAgo = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
};

const testPets = [
  {
    name: 'Max',
    type: 'DOG',
    breed: 'Golden Retriever',
    birthdate: getYearsAgo(3),
    weight: 65,
  },
  {
    name: 'Luna',
    type: 'CAT',
    breed: 'Siamese',
    birthdate: getYearsAgo(2),
    weight: 10,
  },
  {
    name: 'Charlie',
    type: 'DOG',
    breed: 'Labrador',
    birthdate: getYearsAgo(5),
    weight: 70,
  },
  {
    name: 'Bella',
    type: 'DOG',
    breed: 'Beagle',
    birthdate: getYearsAgo(4),
    weight: 25,
  },
  {
    name: 'Oliver',
    type: 'CAT',
    breed: 'Maine Coon',
    birthdate: getYearsAgo(3),
    weight: 15,
  },
  {
    name: 'Daisy',
    type: 'DOG',
    breed: 'Poodle',
    birthdate: getYearsAgo(2),
    weight: 45,
  },
  {
    name: 'Milo',
    type: 'CAT',
    breed: 'Persian',
    birthdate: getYearsAgo(4),
    weight: 12,
  },
  {
    name: 'Lucy',
    type: 'DOG',
    breed: 'German Shepherd',
    birthdate: getYearsAgo(6),
    weight: 75,
  },
  {
    name: 'Leo',
    type: 'CAT',
    breed: 'British Shorthair',
    birthdate: getYearsAgo(1),
    weight: 11,
  },
  {
    name: 'Rocky',
    type: 'DOG',
    breed: 'Boxer',
    birthdate: getYearsAgo(3),
    weight: 60,
  },
];

// Test staff data
const testStaff = [
  {
    firstName: 'Sarah',
    lastName: 'Mitchell',
    email: 'sarah.mitchell@rainytest.com',
    password: 'Test123!',
    role: 'MANAGER',
    department: 'Operations',
    position: 'Kennel Manager',
    phone: '555-0201',
  },
  {
    firstName: 'Tom',
    lastName: 'Rodriguez',
    email: 'tom.rodriguez@rainytest.com',
    password: 'Test123!',
    role: 'Staff',
    department: 'Care',
    position: 'Pet Care Specialist',
    phone: '555-0202',
  },
];

async function seedRainyTestData() {
  try {
    console.log("🌧️  Seeding Rainy Day's Inn with test data...\n");
    console.log(`✅ Using tenant ID: ${RAINY_TENANT_ID}\n`);

    // 1. Create test customers and their pets
    console.log('👥 Creating 10 test customers with pets...');
    const createdCustomers = [];

    for (let i = 0; i < testCustomers.length; i++) {
      const customerData = testCustomers[i];
      const petData = testPets[i];

      // Check if customer already exists
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          tenantId: RAINY_TENANT_ID,
          email: customerData.email,
        },
      });

      if (existingCustomer) {
        console.log(
          `   ⏭️  ${customerData.firstName} ${customerData.lastName} already exists, skipping...`
        );
        continue;
      }

      const customer = await prisma.customer.create({
        data: {
          tenantId: RAINY_TENANT_ID,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          address: `${i + 1}23 Test Street`,
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          emergencyContact: `Emergency Contact ${i + 1}`,
          emergencyPhone: `555-09${i.toString().padStart(2, '0')}`,
        },
      });

      const pet = await prisma.pet.create({
        data: {
          tenantId: RAINY_TENANT_ID,
          customerId: customer.id,
          name: petData.name,
          type: petData.type,
          breed: petData.breed,
          birthdate: petData.birthdate,
          weight: petData.weight,
          gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
          color: ['Brown', 'Black', 'White', 'Golden', 'Gray'][i % 5],
          specialNeeds: i % 3 === 0 ? 'Requires medication' : null,
          vaccinationStatus: {
            rabies: 'current',
            dhpp: 'current',
            bordetella: 'current',
          },
        },
      });

      createdCustomers.push({ customer, pet });
      console.log(
        `   ✓ ${customer.firstName} ${customer.lastName} with pet ${pet.name}`
      );
    }

    console.log(`\n✅ Created ${createdCustomers.length} customers and pets\n`);

    // 2. Create test staff
    console.log('👨‍💼 Creating 2 test staff members...');
    const createdStaff = [];

    for (const staffData of testStaff) {
      // Check if staff already exists
      const existingStaff = await prisma.staff.findFirst({
        where: {
          tenantId: RAINY_TENANT_ID,
          email: staffData.email,
        },
      });

      if (existingStaff) {
        console.log(
          `   ⏭️  ${staffData.firstName} ${staffData.lastName} already exists, skipping...`
        );
        continue;
      }

      const hashedPassword = await bcrypt.hash(staffData.password, 10);

      const staff = await prisma.staff.create({
        data: {
          tenantId: RAINY_TENANT_ID,
          firstName: staffData.firstName,
          lastName: staffData.lastName,
          email: staffData.email,
          password: hashedPassword,
          role: staffData.role,
          department: staffData.department,
          position: staffData.position,
          phone: staffData.phone,
          isActive: true,
        },
      });

      createdStaff.push(staff);
      console.log(`   ✓ ${staff.firstName} ${staff.lastName} (${staff.role})`);
    }

    console.log(`\n✅ Created ${createdStaff.length} staff members\n`);

    // Summary
    console.log('📊 Summary:');
    console.log(`   Customers: ${createdCustomers.length}`);
    console.log(`   Pets: ${createdCustomers.length}`);
    console.log(`   Staff: ${createdStaff.length}`);
    console.log('\n🎉 Rainy test data seeded successfully!');
    console.log('\n📝 Test Staff Login Credentials:');
    console.log('   Email: sarah.mitchell@rainytest.com | Password: Test123!');
    console.log('   Email: tom.rodriguez@rainytest.com | Password: Test123!');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedRainyTestData().catch((error) => {
  console.error(error);
  process.exit(1);
});
