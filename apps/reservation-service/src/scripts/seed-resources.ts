/**
 * Resource Seeder Script
 * 
 * This script creates test resources (kennels) in the database
 * for development and testing purposes.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedResources() {
  console.log('Starting resource seeding...');
  
  // Define the suite types we want to create (matching production data: 173 total)
  const suiteTypes = [
    { type: 'STANDARD_SUITE', count: 138 },
    { type: 'STANDARD_PLUS_SUITE', count: 33 },
    { type: 'VIP_SUITE', count: 2 }
  ];
  
  try {
    // Create resources for each suite type
    for (const suiteType of suiteTypes) {
      console.log(`Creating ${suiteType.count} ${suiteType.type} resources...`);
      
      for (let i = 1; i <= suiteType.count; i++) {
        const name = `${suiteType.type.replace('_', ' ')} ${i}`;
        
        // Create the resource
        await prisma.resource.create({
          data: {
            name,
            type: suiteType.type as any, // Use the specific suite type (VIP_SUITE, etc.)
            description: `A ${suiteType.type.toLowerCase().replace('_', ' ')} for pets`,
            capacity: 1,
            isActive: true,
            tenantId: 'dev' // Add tenantId for multi-tenant support
          }
        });
      }
    }
    
    // Count the resources to verify
    const resourceCount = await prisma.resource.count();
    console.log(`Successfully created ${resourceCount} resources!`);
    
    // List the resources by type
    const resources = await prisma.resource.findMany();
    const typeCount: Record<string, number> = {};
    
    resources.forEach(resource => {
      if (!typeCount[resource.name.split(' ')[0]]) {
        typeCount[resource.name.split(' ')[0]] = 0;
      }
      typeCount[resource.name.split(' ')[0]]++;
    });
    
    console.log('Resources by type:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error seeding resources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedResources()
  .then(() => console.log('Resource seeding complete!'))
  .catch(e => console.error('Error during resource seeding:', e));
