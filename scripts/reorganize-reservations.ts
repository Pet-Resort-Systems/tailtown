/**
 * Reorganize Reservations Script
 *
 * This script redistributes reservations to avoid overlaps:
 * - Daycare reservations go to D rooms (D01Q-D10Q)
 * - Small dogs go to A rooms (A01-A20)
 * - Medium dogs go to B rooms (B01-B20)
 * - Large dogs go to C rooms (C01-C20)
 * - Exceptions made when space is limited
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Reservation {
  id: string;
  startDate: Date;
  endDate: Date;
  petId: string;
  resourceId: string | null;
  serviceId: string;
  pet?: {
    name: string;
    weight: number | null;
    breed: string | null;
  };
  service?: {
    name: string;
    serviceCategory: string;
  };
}

// Infer size from weight
function inferSize(weight: number | null): string {
  if (!weight) return 'MEDIUM'; // Default to medium if unknown
  if (weight < 25) return 'SMALL';
  if (weight < 60) return 'MEDIUM';
  return 'LARGE';
}

interface Resource {
  id: string;
  name: string;
  type: string;
}

// Check if two date ranges overlap
function datesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

// Find available resource for a reservation
function findAvailableResource(
  reservation: Reservation,
  resources: Resource[],
  assignedReservations: Map<string, Reservation[]>
): Resource | null {
  for (const resource of resources) {
    const existingReservations = assignedReservations.get(resource.id) || [];

    // Check if this resource has any overlapping reservations
    const hasOverlap = existingReservations.some((existing) =>
      datesOverlap(
        reservation.startDate,
        reservation.endDate,
        existing.startDate,
        existing.endDate
      )
    );

    if (!hasOverlap) {
      return resource;
    }
  }

  return null;
}

async function main() {
  console.log('🔄 Starting reservation reorganization...\n');

  // Fetch all resources
  const allResources = await prisma.resource.findMany({
    where: {
      type: {
        in: ['STANDARD_SUITE', 'STANDARD_PLUS_SUITE', 'VIP_SUITE'],
      },
    },
    orderBy: { name: 'asc' },
  });

  // Group resources by prefix
  const dRooms = allResources
    .filter((r) => r.name.startsWith('D'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const aRooms = allResources
    .filter((r) => r.name.startsWith('A'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const bRooms = allResources
    .filter((r) => r.name.startsWith('B'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const cRooms = allResources
    .filter((r) => r.name.startsWith('C'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const otherRooms = allResources
    .filter((r) => !['A', 'B', 'C', 'D'].includes(r.name[0]))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`📊 Available Resources:`);
  console.log(`   D Rooms (Daycare): ${dRooms.length}`);
  console.log(`   A Rooms (Small): ${aRooms.length}`);
  console.log(`   B Rooms (Medium): ${bRooms.length}`);
  console.log(`   C Rooms (Large): ${cRooms.length}`);
  console.log(`   Other Rooms: ${otherRooms.length}\n`);

  // Fetch all active reservations with pet and service info
  const reservations = (await prisma.reservation.findMany({
    where: {
      status: {
        in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'],
      },
    },
    include: {
      pet: {
        select: {
          name: true,
          weight: true,
          breed: true,
        },
      },
      service: {
        select: {
          name: true,
          serviceCategory: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
  })) as Reservation[];

  console.log(`📋 Found ${reservations.length} active reservations\n`);

  // Track which reservations are assigned to which resources
  const assignedReservations = new Map<string, Reservation[]>();
  const updates: {
    reservationId: string;
    oldResource: string | null;
    newResource: string;
    reason: string;
  }[] = [];

  // Process reservations in order
  for (const reservation of reservations) {
    const petSize = inferSize(reservation.pet?.weight || null);
    const serviceCategory = reservation.service?.serviceCategory || 'UNKNOWN';
    const isDaycare = serviceCategory === 'DAYCARE';

    let targetRooms: Resource[] = [];
    let roomType = '';

    // Determine target rooms based on service type and pet size
    if (isDaycare) {
      targetRooms = [...dRooms, ...aRooms, ...bRooms, ...cRooms, ...otherRooms];
      roomType = 'D (Daycare)';
    } else if (petSize === 'SMALL') {
      targetRooms = [...aRooms, ...bRooms, ...cRooms, ...dRooms, ...otherRooms];
      roomType = 'A (Small)';
    } else if (petSize === 'MEDIUM') {
      targetRooms = [...bRooms, ...aRooms, ...cRooms, ...dRooms, ...otherRooms];
      roomType = 'B (Medium)';
    } else if (petSize === 'LARGE' || petSize === 'EXTRA_LARGE') {
      targetRooms = [...cRooms, ...bRooms, ...aRooms, ...dRooms, ...otherRooms];
      roomType = 'C (Large)';
    } else {
      // Unknown size - try all rooms
      targetRooms = [...aRooms, ...bRooms, ...cRooms, ...dRooms, ...otherRooms];
      roomType = 'Any (Unknown size)';
    }

    // Find available resource
    const availableResource = findAvailableResource(
      reservation,
      targetRooms,
      assignedReservations
    );

    if (availableResource) {
      // Track this assignment
      if (!assignedReservations.has(availableResource.id)) {
        assignedReservations.set(availableResource.id, []);
      }
      assignedReservations.get(availableResource.id)!.push(reservation);

      // Record update if resource changed
      if (reservation.resourceId !== availableResource.id) {
        const oldResourceName = reservation.resourceId
          ? allResources.find((r) => r.id === reservation.resourceId)?.name ||
            'Unknown'
          : 'None';

        updates.push({
          reservationId: reservation.id,
          oldResource: oldResourceName,
          newResource: availableResource.name,
          reason: `${reservation.pet?.name} (${petSize}) - ${serviceCategory} -> ${roomType}`,
        });
      }
    } else {
      console.log(
        `⚠️  WARNING: Could not find available resource for reservation ${reservation.id}`
      );
      console.log(
        `   Pet: ${reservation.pet?.name} (${petSize}), Service: ${serviceCategory}`
      );
      console.log(
        `   Dates: ${reservation.startDate.toISOString().split('T')[0]} to ${reservation.endDate.toISOString().split('T')[0]}\n`
      );
    }
  }

  console.log(`\n📝 Proposed Changes: ${updates.length}\n`);

  // Show updates
  if (updates.length > 0) {
    console.log('Changes to be made:');
    updates.forEach((update, index) => {
      console.log(
        `${index + 1}. ${update.oldResource} → ${update.newResource}`
      );
      console.log(`   ${update.reason}\n`);
    });

    // Apply updates
    console.log('\n💾 Applying updates...\n');

    for (const update of updates) {
      const resource = allResources.find((r) => r.name === update.newResource);
      if (resource) {
        await prisma.reservation.update({
          where: { id: update.reservationId },
          data: { resourceId: resource.id },
        });
        console.log(`✅ Updated reservation to ${update.newResource}`);
      }
    }

    console.log(`\n✅ Successfully updated ${updates.length} reservations!`);
  } else {
    console.log(
      '✅ No changes needed - all reservations are already optimally assigned!'
    );
  }

  // Show final distribution
  console.log('\n📊 Final Distribution:');
  const distribution = new Map<string, number>();

  assignedReservations.forEach((reservations, resourceId) => {
    const resource = allResources.find((r) => r.id === resourceId);
    if (resource) {
      const prefix = resource.name[0];
      distribution.set(
        prefix,
        (distribution.get(prefix) || 0) + reservations.length
      );
    }
  });

  console.log(`   A Rooms: ${distribution.get('A') || 0} reservations`);
  console.log(`   B Rooms: ${distribution.get('B') || 0} reservations`);
  console.log(`   C Rooms: ${distribution.get('C') || 0} reservations`);
  console.log(`   D Rooms: ${distribution.get('D') || 0} reservations`);
  console.log(`   Other: ${distribution.get('E') || 0} reservations`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
