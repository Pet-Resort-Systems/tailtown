const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCounts() {
  try {
    const customerCount = await prisma.customer.count();
    const reservationCount = await prisma.reservation.count();
    const serviceCount = await prisma.service.count();
    const invoiceCount = await prisma.invoice.count();
    
    console.log({
      customerCount,
      reservationCount,
      serviceCount,
      invoiceCount
    });
  } catch (error) {
    console.error('Error getting counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getCounts();
