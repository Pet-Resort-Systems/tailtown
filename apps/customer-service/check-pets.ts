import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const pets = await prisma.pet.findMany({ take: 10 });
    console.log('Sample pet data:');
    console.log(JSON.stringify(pets, null, 2));
    
    const petCount = await prisma.pet.count();
    console.log(`Total pet count: ${petCount}`);
  } catch (error) {
    console.error('Error checking pet data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
