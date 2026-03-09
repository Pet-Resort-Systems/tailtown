import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting add-on services seeding...');

  try {
    // First, let's get all services to associate add-ons with the right services
    const services = await prisma.service.findMany();
    
    if (services.length === 0) {
      console.log('No services found in the database. Please seed services first.');
      return;
    }

    console.log(`Found ${services.length} services in the database.`);
    
    // Find services by category
    const boardingServices = services.filter(s => s.serviceCategory === 'BOARDING');
    const daycareServices = services.filter(s => s.serviceCategory === 'DAYCARE');
    const groomingServices = services.filter(s => s.serviceCategory === 'GROOMING');
    
    // Log service IDs for reference
    console.log('Boarding service IDs:', boardingServices.map(s => s.id));
    console.log('Daycare service IDs:', daycareServices.map(s => s.id));
    console.log('Grooming service IDs:', groomingServices.map(s => s.id));

    // Create add-ons for boarding services
    if (boardingServices.length > 0) {
      const boardingServiceId = boardingServices[0].id;
      
      const boardingAddOns = [
        {
          name: 'Extra Playtime',
          description: 'Additional 30 minutes of supervised play',
          price: 10,
          duration: 30,
          serviceId: boardingServiceId,
          isActive: true
        },
        {
          name: 'Special Treat',
          description: 'Premium dog treat during the day',
          price: 3,
          duration: 5,
          serviceId: boardingServiceId,
          isActive: true
        },
        {
          name: 'Cuddle Time',
          description: 'One-on-one cuddle session with staff',
          price: 15,
          duration: 15,
          serviceId: boardingServiceId,
          isActive: true
        }
      ];

      for (const addOn of boardingAddOns) {
        // Check if add-on already exists
        const existingAddOn = await prisma.addOnService.findFirst({
          where: {
            name: addOn.name,
            serviceId: addOn.serviceId
          }
        });

        if (!existingAddOn) {
          const created = await prisma.addOnService.create({
            data: addOn
          });
          console.log(`Created boarding add-on: ${created.name} with ID: ${created.id}`);
        } else {
          console.log(`Boarding add-on ${existingAddOn.name} already exists with ID: ${existingAddOn.id}`);
        }
      }
    }

    // Create add-ons for grooming services
    if (groomingServices.length > 0) {
      const groomingServiceId = groomingServices[0].id;
      
      const groomingAddOns = [
        {
          name: 'Hair Blow Out',
          description: 'Professional blow drying and styling',
          price: 15,
          duration: 20,
          serviceId: groomingServiceId,
          isActive: true
        },
        {
          name: 'Nail Polish',
          description: 'Colorful nail polish application',
          price: 5,
          duration: 10,
          serviceId: groomingServiceId,
          isActive: true
        },
        {
          name: 'Teeth Brushing',
          description: 'Dental hygiene service',
          price: 8,
          duration: 10,
          serviceId: groomingServiceId,
          isActive: true
        }
      ];

      for (const addOn of groomingAddOns) {
        // Check if add-on already exists
        const existingAddOn = await prisma.addOnService.findFirst({
          where: {
            name: addOn.name,
            serviceId: addOn.serviceId
          }
        });

        if (!existingAddOn) {
          const created = await prisma.addOnService.create({
            data: addOn
          });
          console.log(`Created grooming add-on: ${created.name} with ID: ${created.id}`);
        } else {
          console.log(`Grooming add-on ${existingAddOn.name} already exists with ID: ${existingAddOn.id}`);
        }
      }
    }

    console.log('Add-on services seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding add-on services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
