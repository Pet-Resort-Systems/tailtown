const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReservations() {
  try {
    const total = await prisma.reservation.count({ where: { tenantId: 'dev' } });
    const withExternal = await prisma.reservation.count({ 
      where: { tenantId: 'dev', externalId: { not: null } } 
    });
    
    console.log(`Total reservations in DB: ${total}`);
    console.log(`With externalId: ${withExternal}`);
    console.log(`Without externalId: ${total - withExternal}`);
    
    if (withExternal > 0) {
      const sample = await prisma.reservation.findFirst({
        where: { tenantId: 'dev', externalId: { not: null } },
        include: { customer: true, pet: true, resource: true }
      });
      
      console.log('\nSample imported reservation:');
      console.log(`  ID: ${sample.id}`);
      console.log(`  External ID: ${sample.externalId}`);
      console.log(`  Customer: ${sample.customer.firstName} ${sample.customer.lastName}`);
      console.log(`  Pet: ${sample.pet.name}`);
      console.log(`  Resource: ${sample.resource?.name || 'N/A'}`);
      console.log(`  Dates: ${sample.startDate.toISOString().split('T')[0]} to ${sample.endDate.toISOString().split('T')[0]}`);
      console.log(`  Status: ${sample.status}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservations();
