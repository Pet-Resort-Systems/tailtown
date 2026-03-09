const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMigration() {
  try {
    const customers = await prisma.customer.count({ where: { tenantId: 'dev', externalId: { not: null } } });
    const pets = await prisma.pet.count({ where: { tenantId: 'dev', externalId: { not: null } } });
    const services = await prisma.service.count({ where: { tenantId: 'dev', externalId: { not: null } } });
    const reservations = await prisma.reservation.count({ where: { tenantId: 'dev', externalId: { not: null } } });
    
    console.log('\n📊 Migration Results:');
    console.log('='.repeat(50));
    console.log(`✅ Customers imported: ${customers}`);
    console.log(`✅ Pets imported: ${pets}`);
    console.log(`✅ Services imported: ${services}`);
    console.log(`✅ Reservations imported: ${reservations}`);
    console.log('='.repeat(50));
    
    if (reservations > 0) {
      const sampleReservation = await prisma.reservation.findFirst({
        where: { tenantId: 'dev', externalId: { not: null } },
        include: {
          customer: true,
          pet: true,
          service: true
        }
      });
      
      console.log('\n📋 Sample Reservation:');
      console.log(`Customer: ${sampleReservation.customer.firstName} ${sampleReservation.customer.lastName}`);
      console.log(`Pet: ${sampleReservation.pet.name}`);
      console.log(`Service: ${sampleReservation.service.name}`);
      console.log(`Dates: ${sampleReservation.startDate.toISOString().split('T')[0]} to ${sampleReservation.endDate.toISOString().split('T')[0]}`);
      console.log(`Status: ${sampleReservation.status}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigration();
