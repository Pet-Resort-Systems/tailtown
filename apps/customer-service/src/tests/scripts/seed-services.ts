import { PrismaClient, ServiceCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedServices() {
  try {
    console.log('Starting to seed services data...');

    // Read test data file
    const dataFilePath = path.join(__dirname, '../data/service-test-data.json');
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

    // Create a mapping of service names to IDs for linking add-ons later
    const serviceNameToId: Record<string, string> = {};

    // Create services first
    for (const service of data.services) {
      // Map string category to enum value
      const serviceData = {
        ...service,
        serviceCategory: service.serviceCategory as ServiceCategory
      };

      console.log(`Creating service: ${service.name}`);
      const createdService = await prisma.service.create({
        data: serviceData
      });

      // Store mapping for add-ons
      serviceNameToId[service.name] = createdService.id;
    }

    // Now create add-ons with proper service relationships
    for (const addOn of data.addOns) {
      const { applicableServiceIds, ...addOnData } = addOn;

      for (const serviceName of applicableServiceIds) {
        const serviceId = serviceNameToId[serviceName];
        
        if (serviceId) {
          console.log(`Creating add-on "${addOn.name}" for service: ${serviceName}`);
          
          await prisma.addOnService.create({
            data: {
              ...addOnData,
              serviceId
            }
          });
        } else {
          console.warn(`Warning: Service "${serviceName}" not found for add-on "${addOn.name}"`);
        }
      }
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedServices()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
  });
