/**
 * Fix imported Gingr reservations - add default resourceId
 * 
 * The calendar requires resourceId to display reservations.
 * This script assigns a default resource to all imported reservations.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixReservations() {
  try {
    console.log('Finding reservations without resourceId...');
    
    const reservationsWithoutResource = await prisma.reservation.findMany({
      where: {
        tenantId: 'dev',
        resourceId: null
      },
      select: { id: true }
    });
    
    console.log(`Found ${reservationsWithoutResource.length} reservations without resourceId`);
    
    if (reservationsWithoutResource.length === 0) {
      console.log('✅ All reservations already have resourceId');
      return;
    }
    
    // Get a default resource
    const defaultResource = await prisma.resource.findFirst({
      where: {
        tenantId: 'dev',
        type: 'STANDARD_SUITE',
        isActive: true
      }
    });
    
    if (!defaultResource) {
      console.error('❌ No default resource found! Please create at least one STANDARD_SUITE resource.');
      process.exit(1);
    }
    
    console.log(`Using default resource: ${defaultResource.name} (${defaultResource.id})`);
    console.log('Updating reservations...');
    
    // Update all reservations
    const result = await prisma.reservation.updateMany({
      where: {
        tenantId: 'dev',
        resourceId: null
      },
      data: {
        resourceId: defaultResource.id
      }
    });
    
    console.log(`✅ Updated ${result.count} reservations with resourceId`);
    console.log('\n🎉 Reservations should now display in the calendar!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixReservations();
