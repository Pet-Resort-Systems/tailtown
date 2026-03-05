import { PrismaClient } from '@prisma/client';

/**
 * This script generates sample data for testing the analytics dashboard
 * It creates invoices, reservations, and add-on services with realistic data
 */

const prisma = new PrismaClient();

async function main() {
  console.log('Generating sample analytics data...');
  
  // Get existing customers, services, and add-ons
  const customers = await prisma.customer.findMany();
  const services = await prisma.service.findMany();
  const addOns = await prisma.addOn.findMany();
  
  if (customers.length === 0 || services.length === 0 || addOns.length === 0) {
    console.error('Error: Need customers, services, and add-ons in the database');
    return;
  }
  
  console.log(`Found ${customers.length} customers, ${services.length} services, and ${addOns.length} add-ons`);
  
  // Generate invoices for the last 3 months
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - 3);
  
  // Generate 30 invoices with random dates in the last 3 months
  for (let i = 0; i < 30; i++) {
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomService = services[Math.floor(Math.random() * services.length)];
    
    // Random date between startDate and today
    const randomDate = new Date(startDate.getTime() + Math.random() * (today.getTime() - startDate.getTime()));
    
    // Create a reservation
    const reservation = await prisma.reservation.create({
      data: {
        customerId: randomCustomer.id,
        petId: randomCustomer.pets[0]?.id || null,
        serviceId: randomService.id,
        startDate: randomDate,
        endDate: new Date(randomDate.getTime() + 24 * 60 * 60 * 1000), // Next day
        status: 'COMPLETED',
        notes: 'Sample reservation for analytics testing',
      }
    });
    
    console.log(`Created reservation ${i + 1}/30 for customer ${randomCustomer.firstName} ${randomCustomer.lastName}`);
    
    // Add random add-ons (0-3)
    const numAddOns = Math.floor(Math.random() * 4);
    const addOnIds = new Set();
    
    for (let j = 0; j < numAddOns; j++) {
      const randomAddOn = addOns[Math.floor(Math.random() * addOns.length)];
      
      // Skip if we already added this add-on
      if (addOnIds.has(randomAddOn.id)) {
        continue;
      }
      
      addOnIds.add(randomAddOn.id);
      
      await prisma.reservationAddOn.create({
        data: {
          reservationId: reservation.id,
          addOnId: randomAddOn.id,
          price: randomAddOn.price,
        }
      });
    }
    
    // Calculate total price (service price + add-ons)
    const servicePrice = randomService.price || 50;
    const addOnTotal = Array.from(addOnIds).reduce((sum, id) => {
      const addOn = addOns.find(a => a.id === id);
      return sum + (addOn?.price || 0);
    }, 0);
    
    const total = servicePrice + addOnTotal;
    
    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        customerId: randomCustomer.id,
        reservationId: reservation.id,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        issueDate: randomDate,
        dueDate: new Date(randomDate.getTime() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        total: total,
        status: 'PAID',
        notes: 'Sample invoice for analytics testing',
      }
    });
    
    // Create line items
    await prisma.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        description: randomService.name,
        amount: servicePrice,
        quantity: 1,
      }
    });
    
    // Add line items for add-ons
    for (const addOnId of addOnIds) {
      const addOn = addOns.find(a => a.id === addOnId);
      if (addOn) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            description: `Add-on: ${addOn.name}`,
            amount: addOn.price,
            quantity: 1,
          }
        });
      }
    }
    
    // Create payment
    await prisma.payment.create({
      data: {
        customerId: randomCustomer.id,
        invoiceId: invoice.id,
        amount: total,
        paymentDate: randomDate,
        paymentMethod: 'CREDIT_CARD',
        status: 'COMPLETED',
        notes: 'Sample payment for analytics testing',
      }
    });
    
    console.log(`Created invoice and payment for reservation ${i + 1}/30`);
  }
  
  console.log('Sample data generation complete!');
}

main()
  .catch(e => {
    console.error('Error generating sample data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
