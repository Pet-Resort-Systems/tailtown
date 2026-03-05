import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting mock data removal process...');
    
    // First, check what data we have
    const petCount = await prisma.pet.count();
    console.log(`Found ${petCount} pets before cleanup`);
    
    const customerCount = await prisma.customer.count();
    console.log(`Found ${customerCount} customers before cleanup`);
    
    // Delete all mock pets (all pets in this case as they appear to be mock data)
    const deletedPets = await prisma.pet.deleteMany({});
    console.log(`Deleted ${deletedPets.count} mock pets`);
    
    // Delete mock customers (those with IDs starting with "real-customer-")
    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        id: {
          startsWith: 'real-customer-'
        }
      }
    });
    console.log(`Deleted ${deletedCustomers.count} mock customers`);
    
    // Check if there's any data left
    const remainingPets = await prisma.pet.count();
    console.log(`Remaining pets after cleanup: ${remainingPets}`);
    
    const remainingCustomers = await prisma.customer.count();
    console.log(`Remaining customers after cleanup: ${remainingCustomers}`);
    
    console.log('Mock data removal completed successfully');
  } catch (error) {
    console.error('Error removing mock data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
