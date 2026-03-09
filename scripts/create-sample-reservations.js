#!/usr/bin/env node

// This script creates sample reservations in the reservation-service database
// Run from: cd /opt/tailtown/apps/reservation-service && node ../../scripts/create-sample-reservations.js rainy

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function getRandomDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}

async function createSampleReservations(tenantSubdomain, count = 10) {
  try {
    console.log(`\n📅 Creating ${count} sample reservations for ${tenantSubdomain}...\n`);

    // Get tenant UUID
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSubdomain }
    });

    if (!tenant) {
      console.error(`❌ Tenant '${tenantSubdomain}' not found`);
      process.exit(1);
    }

    // Get customers, pets, and resources from customer service
    // Note: We'll need to pass these as IDs since they're in different databases
    const customerServicePrisma = new (require('@prisma/client')).PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://tailtown_user:tailtown_password@localhost:5432/tailtown_customer'
        }
      }
    });

    const customers = await customerServicePrisma.customer.findMany({
      where: { tenantId: tenant.id },
      include: { pets: true }
    });

    const resources = await customerServicePrisma.resource.findMany({
      where: { tenantId: tenant.id, type: 'SUITE' }
    });

    await customerServicePrisma.$disconnect();

    if (customers.length === 0) {
      console.error('❌ No customers found');
      process.exit(1);
    }

    if (resources.length === 0) {
      console.error('❌ No resources found');
      process.exit(1);
    }

    console.log(`Found ${customers.length} customers and ${resources.length} resources\n`);

    const statuses = ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];
    const created = [];

    for (let i = 0; i < count; i++) {
      const customer = randomItem(customers);
      const pet = customer.pets.length > 0 ? randomItem(customer.pets) : null;
      const resource = randomItem(resources);
      const status = randomItem(statuses);
      
      const startDay = randomInt(-5, 14); // Some past, mostly future
      const duration = randomInt(2, 7);
      
      const checkInDate = getRandomDate(startDay);
      const checkOutDate = getRandomDate(startDay + duration);

      const reservation = await prisma.reservation.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          petId: pet?.id,
          resourceId: resource.id,
          status: status,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          notes: `Sample reservation ${i + 1}`
        }
      });

      const emoji = status === 'CONFIRMED' ? '📅' : status === 'CHECKED_IN' ? '🏠' : '✅';
      console.log(
        `${emoji} ${customer.name} - ${pet?.name || 'No pet'} - ${resource.name} - ` +
        `${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()} - ${status}`
      );

      created.push(reservation);
    }

    const statusCounts = created.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n✅ Created ${created.length} reservations!`);
    console.log(`\n📊 Summary:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const args = process.argv.slice(2);

if (args.length < 1 || args.length > 2) {
  console.log('Usage: node create-sample-reservations.js <tenant-subdomain> [count]');
  console.log('Example: node create-sample-reservations.js rainy 10');
  console.log('Default: 10 reservations');
  console.log('\nIMPORTANT: Run from reservation-service directory:');
  console.log('cd /opt/tailtown/apps/reservation-service && node ../../scripts/create-sample-reservations.js rainy');
  process.exit(1);
}

const tenantSubdomain = args[0];
const count = args[1] ? parseInt(args[1]) : 10;

createSampleReservations(tenantSubdomain, count);
