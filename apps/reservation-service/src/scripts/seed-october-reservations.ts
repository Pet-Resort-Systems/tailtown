// @ts-nocheck
/**
 * October Reservations Seeder Script
 *
 * Creates 40 realistic reservations for October 2025
 * using actual customers and pets, spread across Room A kennels
 *
 * NOTE: This script references Customer/Pet models that have been removed from
 * the reservation service schema. Run against customer service database if needed.
 */

import { prisma } from '../config/prisma.js';

async function seedOctoberReservations() {
  console.log('Starting October reservations seeding...');

  const tenantId = 'dev';

  try {
    // Get all customers with their pets
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      include: {
        pets: true,
      },
    });

    if (customers.length === 0) {
      console.error('No customers found! Please seed customers first.');
      return;
    }

    console.log(`Found ${customers.length} customers with pets`);

    // Get all Room A kennels (A01-A40)
    const roomAKennels = await prisma.resource.findMany({
      where: {
        tenantId,
        name: {
          startsWith: 'A',
        },
        type: 'STANDARD_SUITE',
      },
      orderBy: { name: 'asc' },
    });

    if (roomAKennels.length === 0) {
      console.error('No Room A kennels found! Please seed resources first.');
      return;
    }

    console.log(`Found ${roomAKennels.length} Room A kennels`);

    // Get the boarding service
    const boardingService = await prisma.service.findFirst({
      where: {
        name: {
          contains: 'Boarding',
          mode: 'insensitive',
        },
      },
    });

    if (!boardingService) {
      console.error('No boarding service found! Please seed services first.');
      return;
    }

    console.log(`Using service: ${boardingService.name}`);

    // Generate dates for rest of October 2025
    const today = new Date();
    const currentDay = today.getDate();
    const october2025 = new Date(2025, 9, 1); // October is month 9 (0-indexed)
    const endOfOctober = new Date(2025, 9, 31);

    // Start from today or October 26 (whichever is later)
    const startDay = Math.max(currentDay, 26);

    const reservations = [];
    let kennelIndex = 0;
    let customerIndex = 0;

    // Create 40 reservations spread throughout the rest of October
    for (let i = 0; i < 40; i++) {
      // Get customer and pet
      const customer = customers[customerIndex % customers.length];

      if (customer.pets.length === 0) {
        customerIndex++;
        continue;
      }

      const pet = customer.pets[0]; // Use first pet
      const kennel = roomAKennels[kennelIndex % roomAKennels.length];

      // Calculate check-in date (spread across remaining days)
      const dayOffset = Math.floor((i / 40) * (31 - startDay + 1));
      const checkInDate = new Date(2025, 9, startDay + dayOffset);

      // Random stay length (1-5 nights)
      const stayLength = Math.floor(Math.random() * 5) + 1;
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + stayLength);

      // Don't create reservations that go past October
      if (checkOutDate > endOfOctober) {
        checkOutDate.setTime(endOfOctober.getTime());
      }

      // Generate order number
      const orderNumber = `RES-${Date.now()}-${i.toString().padStart(3, '0')}`;

      // Random status (mostly confirmed, some pending)
      const statuses: ('CONFIRMED' | 'PENDING')[] = [
        'CONFIRMED',
        'CONFIRMED',
        'CONFIRMED',
        'PENDING',
      ];
      const status = statuses[Math.floor(Math.random() * statuses.length)] as
        | 'CONFIRMED'
        | 'PENDING';

      reservations.push({
        tenantId,
        customerId: customer.id,
        petId: pet.id,
        resourceId: kennel.id,
        serviceId: boardingService.id,
        startDate: checkInDate,
        endDate: checkOutDate,
        status,
        orderNumber,
        notes: `October ${checkInDate.getDate()}-${checkOutDate.getDate()} stay`,
        staffNotes: `Room ${kennel.name} - ${pet.name}`,
        preChecked: false,
        isRecurring: false,
        earlyDropOff: Math.random() > 0.7,
        latePickup: Math.random() > 0.7,
      });

      kennelIndex++;
      customerIndex++;
    }

    console.log(`\nCreating ${reservations.length} reservations...`);

    // Create reservations in batches
    let created = 0;
    for (const reservation of reservations) {
      try {
        await prisma.reservation.create({
          data: reservation,
        });
        created++;

        if (created % 10 === 0) {
          console.log(
            `  Created ${created}/${reservations.length} reservations...`
          );
        }
      } catch (error: any) {
        console.error(
          `  Error creating reservation for ${reservation.orderNumber}:`,
          error.message
        );
      }
    }

    console.log(`\n✅ Successfully created ${created} reservations!`);

    // Show summary
    const summary = await prisma.reservation.groupBy({
      by: ['status'],
      where: {
        tenantId,
        startDate: {
          gte: new Date(2025, 9, startDay),
        },
      },
      _count: true,
    });

    console.log('\nReservation summary:');
    summary.forEach((item) => {
      console.log(`  ${item.status}: ${item._count} reservations`);
    });

    // Show date range
    const firstRes = await prisma.reservation.findFirst({
      where: { tenantId },
      orderBy: { startDate: 'asc' },
    });

    const lastRes = await prisma.reservation.findFirst({
      where: { tenantId },
      orderBy: { endDate: 'desc' },
    });

    if (firstRes && lastRes) {
      console.log(
        `\nDate range: ${firstRes.startDate.toLocaleDateString()} to ${lastRes.endDate.toLocaleDateString()}`
      );
    }

    // Show sample reservations
    console.log('\nSample reservations:');
    const samples = await prisma.reservation.findMany({
      where: { tenantId },
      include: {
        customer: true,
        pet: true,
        resource: true,
      },
      take: 5,
      orderBy: { startDate: 'asc' },
    });

    samples.forEach((res) => {
      console.log(
        `  ${res.resource?.name} - ${res.pet?.name} (${res.customer?.firstName} ${res.customer?.lastName})`
      );
      console.log(
        `    ${res.startDate.toLocaleDateString()} to ${res.endDate.toLocaleDateString()} - ${
          res.status
        }`
      );
    });
  } catch (error) {
    console.error('Error seeding reservations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedOctoberReservations()
  .then(() => console.log('\n🎉 October reservations seeding complete!'))
  .catch((e) => {
    console.error('Error during reservation seeding:', e);
    process.exit(1);
  });
