import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestResources() {
  try {
    console.log('Creating test kennel resources...');
    
    // Create Standard Suites
    for (let i = 1; i <= 5; i++) {
      await prisma.resource.create({
        data: {
          name: `Standard Suite ${i}`,
          type: 'STANDARD_SUITE',
          description: 'A comfortable standard suite for your pet',
          capacity: 1,
          isActive: true,
          suiteNumber: i,
          location: 'Main Building',
          maintenanceStatus: 'OPERATIONAL'
        }
      });
    }
    
    // Create Standard Plus Suites
    for (let i = 1; i <= 3; i++) {
      await prisma.resource.create({
        data: {
          name: `Standard Plus Suite ${i}`,
          type: 'STANDARD_PLUS_SUITE',
          description: 'A spacious suite with extra amenities',
          capacity: 1,
          isActive: true,
          suiteNumber: i + 10,
          location: 'Main Building',
          maintenanceStatus: 'OPERATIONAL'
        }
      });
    }
    
    // Create VIP Suites
    for (let i = 1; i <= 2; i++) {
      await prisma.resource.create({
        data: {
          name: `VIP Suite ${i}`,
          type: 'VIP_SUITE',
          description: 'Our most luxurious accommodation with premium features',
          capacity: 1,
          isActive: true,
          suiteNumber: i + 20,
          location: 'VIP Wing',
          maintenanceStatus: 'OPERATIONAL'
        }
      });
    }
    
    console.log('Test resources created successfully!');
  } catch (error) {
    console.error('Error creating test resources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestResources();
