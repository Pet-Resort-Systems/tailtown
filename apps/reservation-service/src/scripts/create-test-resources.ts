/**
 * Test Resource Creator Script
 * 
 * This script creates test kennel resources in the database
 * with the correct type and tenant ID for the calendar view.
 * Uses raw SQL to bypass any Prisma schema validation issues.
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function createTestResources() {
  console.log('Creating test kennel resources...');
  
  // Define the suite types we want to create
  const suiteTypes = [
    { type: 'STANDARD_SUITE', count: 5, displayName: 'Standard Suite' },
    { type: 'STANDARD_PLUS_SUITE', count: 3, displayName: 'Standard Plus Suite' },
    { type: 'VIP_SUITE', count: 2, displayName: 'VIP Suite' }
  ];
  
  // The tenant ID used in the frontend
  const tenantId = '1';
  
  try {
    // First, check if we already have resources for this tenant using raw SQL
    const existingResources = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count 
      FROM "Resource" 
      WHERE "organizationId" = ${tenantId}
    `;
    
    const existingCount = parseInt(existingResources[0]?.count || '0');
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing resources for tenant ${tenantId}.`);
      console.log('Skipping creation to avoid duplicates.');
      return;
    }
    
    // Create resources for each suite type
    let createdCount = 0;
    
    for (const suiteType of suiteTypes) {
      console.log(`Creating ${suiteType.count} ${suiteType.type} resources...`);
      
      for (let i = 1; i <= suiteType.count; i++) {
        const resourceId = uuidv4();
        const name = `${suiteType.displayName} ${i}`;
        
        // Create the resource with raw SQL to ensure we have the correct fields
        // This bypasses any Prisma schema validation issues
        await prisma.$executeRaw`
          INSERT INTO "Resource" (
            "id", 
            "name", 
            "type", 
            "description", 
            "capacity", 
            "isActive", 
            "createdAt", 
            "updatedAt",
            "organizationId"
          ) VALUES (
            ${resourceId},
            ${name},
            ${suiteType.type},
            ${'A ' + suiteType.displayName.toLowerCase() + ' for pets'},
            ${1},
            ${true},
            ${new Date()},
            ${new Date()},
            ${tenantId}
          )
        `;
        
        createdCount++;
      }
    }
    
    console.log(`Successfully created ${createdCount} resources for tenant ${tenantId}!`);
    
    // Verify the resources were created
    const resources = await prisma.$queryRaw`
      SELECT "type", COUNT(*) as count 
      FROM "Resource" 
      WHERE "organizationId" = ${tenantId} 
      GROUP BY "type"
    `;
    
    console.log('Resources by type:');
    console.log(resources);
    
  } catch (error) {
    console.error('Error creating resources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the creator function
createTestResources()
  .then(() => console.log('Resource creation complete!'))
  .catch(e => console.error('Error during resource creation:', e));
