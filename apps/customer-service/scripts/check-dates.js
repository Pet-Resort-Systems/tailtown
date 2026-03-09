const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  try {
    console.log('=== CHECKING RESERVATION DATES ===\n');
    
    // Get total reservation count
    const totalReservations = await prisma.reservation.count();
    console.log(`Total reservations in database: ${totalReservations}`);
    
    // Get date range of all reservations
    const dateRange = await prisma.reservation.aggregate({
      _min: {
        startDate: true
      },
      _max: {
        startDate: true
      }
    });
    
    console.log(`Earliest reservation: ${dateRange._min.startDate}`);
    console.log(`Latest reservation: ${dateRange._max.startDate}`);
    
    // Check reservations for current month (September 2025)
    const currentMonthStart = new Date('2025-09-01');
    const currentMonthEnd = new Date('2025-09-30T23:59:59.999Z');
    
    const currentMonthReservations = await prisma.reservation.count({
      where: {
        startDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      }
    });
    
    console.log(`\nReservations in September 2025: ${currentMonthReservations}`);
    
    // Check reservations for this week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    
    const thisWeekReservations = await prisma.reservation.count({
      where: {
        startDate: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    });
    
    console.log(`Reservations this week (${startOfWeek.toDateString()} - ${endOfWeek.toDateString()}): ${thisWeekReservations}`);
    
    // Get sample of recent reservations
    console.log('\n=== SAMPLE RECENT RESERVATIONS ===');
    const recentReservations = await prisma.reservation.findMany({
      take: 5,
      orderBy: {
        startDate: 'desc'
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        service: {
          select: {
            name: true
          }
        }
      }
    });
    
    recentReservations.forEach((res, index) => {
      console.log(`${index + 1}. ${res.customer.firstName} ${res.customer.lastName} - ${res.service.name}`);
      console.log(`   Date: ${res.startDate.toDateString()} - ${res.endDate.toDateString()}`);
      console.log(`   Status: ${res.status}\n`);
    });
    
    // Check invoice data
    console.log('=== CHECKING INVOICE DATA ===');
    const totalInvoices = await prisma.invoice.count();
    const totalRevenue = await prisma.invoice.aggregate({
      _sum: {
        total: true
      }
    });
    
    console.log(`Total invoices: ${totalInvoices}`);
    console.log(`Total revenue: $${totalRevenue._sum.total || 0}`);
    
    // Check invoice date range
    const invoiceDateRange = await prisma.invoice.aggregate({
      _min: {
        issueDate: true
      },
      _max: {
        issueDate: true
      }
    });
    
    console.log(`Invoice date range: ${invoiceDateRange._min.issueDate} to ${invoiceDateRange._max.issueDate}`);
    
  } catch (error) {
    console.error('Error checking dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();
