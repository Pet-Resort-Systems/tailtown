/**
 * Test Data Setup
 * Creates consistent test data for E2E tests
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TestCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface TestPet {
  id: string;
  name: string;
  type: string;
  breed: string;
  customerId: string;
}

export interface TestService {
  id: string;
  name: string;
  serviceCategory: string;
  price: number;
  duration: number;
}

export interface TestResource {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

/**
 * Setup test data before running E2E tests
 */
export async function setupTestData() {
  const tenantId = 'dev';

  // 1. Create test customer
  const testCustomer = await prisma.customer.upsert({
    where: { 
      tenantId_email: { 
        tenantId, 
        email: 'test.customer@example.com' 
      } 
    },
    update: {},
    create: {
      tenantId,
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test.customer@example.com',
      phone: '555-0100',
      address: '123 Test St',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      isActive: true,
    },
  });

  // 2. Create test pets
  const buddy = await prisma.pet.upsert({
    where: { id: 'test-pet-buddy' },
    update: {},
    create: {
      id: 'test-pet-buddy',
      tenantId,
      customerId: testCustomer.id,
      name: 'Buddy',
      type: 'DOG',
      breed: 'Golden Retriever',
      gender: 'MALE',
      birthDate: new Date('2020-01-15'),
      weight: 65,
      isNeutered: true,
      isActive: true,
    },
  });

  const max = await prisma.pet.upsert({
    where: { id: 'test-pet-max' },
    update: {},
    create: {
      id: 'test-pet-max',
      tenantId,
      customerId: testCustomer.id,
      name: 'Max',
      type: 'DOG',
      breed: 'Labrador',
      gender: 'MALE',
      birthDate: new Date('2019-06-20'),
      weight: 70,
      isNeutered: true,
      isActive: true,
    },
  });

  // 3. Create test services
  const boardingService = await prisma.service.upsert({
    where: { id: 'test-service-boarding' },
    update: {},
    create: {
      id: 'test-service-boarding',
      tenantId,
      name: 'Standard Boarding',
      serviceCategory: 'BOARDING',
      price: 50.00,
      duration: 1440, // 24 hours
      isActive: true,
    },
  });

  const daycareService = await prisma.service.upsert({
    where: { id: 'test-service-daycare' },
    update: {},
    create: {
      id: 'test-service-daycare',
      tenantId,
      name: 'Full Day Daycare',
      serviceCategory: 'DAYCARE',
      price: 30.00,
      duration: 480, // 8 hours
      isActive: true,
    },
  });

  const groomingService = await prisma.service.upsert({
    where: { id: 'test-service-grooming' },
    update: {},
    create: {
      id: 'test-service-grooming',
      tenantId,
      name: 'Full Groom',
      serviceCategory: 'GROOMING',
      price: 75.00,
      duration: 120, // 2 hours
      isActive: true,
    },
  });

  // 4. Create test resources (suites)
  const standardSuite = await prisma.resource.upsert({
    where: { id: 'test-resource-suite-1' },
    update: {},
    create: {
      id: 'test-resource-suite-1',
      tenantId,
      name: 'Test Suite 1',
      type: 'STANDARD_SUITE',
      capacity: 1,
      isActive: true,
    },
  });

  const standardSuite2 = await prisma.resource.upsert({
    where: { id: 'test-resource-suite-2' },
    update: {},
    create: {
      id: 'test-resource-suite-2',
      tenantId,
      name: 'Test Suite 2',
      type: 'STANDARD_SUITE',
      capacity: 1,
      isActive: true,
    },
  });

  // 5. Create test staff (groomer)
  const groomer = await prisma.staff.upsert({
    where: { 
      tenantId_email: { 
        tenantId, 
        email: 'sarah.johnson@tailtown.com' 
      } 
    },
    update: {},
    create: {
      tenantId,
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@tailtown.com',
      phone: '555-0200',
      role: 'GROOMER',
      isActive: true,
      password: 'hashed_password_here', // Not used in tests
    } as any,
  });

  // 6. Create test training class
  const trainingClass = await prisma.trainingClass.upsert({
    where: { id: 'test-training-class-1' },
    update: {},
    create: {
      id: 'test-training-class-1',
      tenantId,
      name: 'Basic Obedience',
      description: 'Learn basic commands and good behavior',
      instructorId: groomer.id,
      maxCapacity: 8,
      pricePerSession: 25.00,
      totalSessions: 6,
      sessionDuration: 60,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      dayOfWeek: 'SATURDAY',
      startTime: '10:00',
      status: 'SCHEDULED',
    } as any,
  });

  console.log('✅ Test data setup complete');
  console.log(`Customer: ${testCustomer.firstName} ${testCustomer.lastName} (${testCustomer.id})`);
  console.log(`Pets: Buddy (${buddy.id}), Max (${max.id})`);
  console.log(`Services: Boarding, Daycare, Grooming`);
  console.log(`Resources: 2 test suites`);
  console.log(`Staff: Sarah Johnson (Groomer)`);
  console.log(`Training: Basic Obedience class`);

  return {
    customer: testCustomer,
    pets: { buddy, max },
    services: { boarding: boardingService, daycare: daycareService, grooming: groomingService },
    resources: { suite1: standardSuite, suite2: standardSuite2 },
    staff: { groomer },
    trainingClass,
  };
}

/**
 * Cleanup test data after running E2E tests
 */
export async function cleanupTestData() {
  const tenantId = 'dev';

  // Delete in reverse order of dependencies
  await prisma.reservation.deleteMany({
    where: { 
      tenantId,
      customer: { email: 'test.customer@example.com' }
    }
  });

  await prisma.enrollment.deleteMany({
    where: {
      tenantId,
      customer: { email: 'test.customer@example.com' }
    }
  });

  await prisma.pet.deleteMany({
    where: {
      tenantId,
      customer: { email: 'test.customer@example.com' }
    }
  });

  await prisma.customer.deleteMany({
    where: {
      tenantId,
      email: 'test.customer@example.com'
    }
  });

  // Clean up test resources
  await prisma.resource.deleteMany({
    where: {
      id: { in: ['test-resource-suite-1', 'test-resource-suite-2'] }
    }
  });

  // Clean up test services
  await prisma.service.deleteMany({
    where: {
      id: { in: ['test-service-boarding', 'test-service-daycare', 'test-service-grooming'] }
    }
  });

  // Clean up test training class
  await prisma.trainingClass.deleteMany({
    where: {
      id: 'test-training-class-1'
    }
  });

  console.log('✅ Test data cleanup complete');
}

/**
 * Reset test data - cleanup and setup fresh
 */
export async function resetTestData() {
  await cleanupTestData();
  return await setupTestData();
}
