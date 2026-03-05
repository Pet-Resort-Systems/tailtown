import { PrismaClient, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function addGroomingAddOns() {
  try {
    console.log('Starting to add add-ons to grooming services...');
    
    // Find all grooming services
    const groomingServices = await prisma.service.findMany({
      where: {
        serviceCategory: ServiceCategory.GROOMING,
        isActive: true
      }
    });
    
    console.log(`Found ${groomingServices.length} grooming services`);
    
    // Sample add-ons for grooming services
    const groomingAddOns = [
      {
        name: 'Nail Grinding',
        description: 'Smooth nail edges after trimming',
        price: 8.99,
        duration: 10
      },
      {
        name: 'Teeth Brushing',
        description: 'Basic teeth cleaning',
        price: 12.99,
        duration: 15
      },
      {
        name: 'Ear Cleaning',
        description: 'Thorough ear cleaning',
        price: 9.99,
        duration: 10
      },
      {
        name: 'Paw Balm Treatment',
        description: 'Moisturizing treatment for paw pads',
        price: 7.99,
        duration: 5
      },
      {
        name: 'De-shedding Treatment',
        description: 'Reduces shedding by up to 90%',
        price: 15.99,
        duration: 20
      }
    ];
    
    // Add add-ons to each grooming service
    for (const service of groomingServices) {
      console.log(`Adding add-ons to service: ${service.name} (ID: ${service.id})`);
      
      // Check if service already has add-ons
      const existingAddOns = await prisma.addOnService.findMany({
        where: {
          serviceId: service.id
        }
      });
      
      if (existingAddOns.length > 0) {
        console.log(`Service ${service.name} already has ${existingAddOns.length} add-ons. Skipping.`);
        continue;
      }
      
      // Add add-ons to this service
      for (const addOn of groomingAddOns) {
        await prisma.addOnService.create({
          data: {
            ...addOn,
            serviceId: service.id
          }
        });
        console.log(`Added add-on "${addOn.name}" to service "${service.name}"`);
      }
    }
    
    console.log('Successfully added add-ons to grooming services!');
  } catch (error) {
    console.error('Error adding add-ons to grooming services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
addGroomingAddOns()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error));
