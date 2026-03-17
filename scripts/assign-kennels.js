const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignKennels() {
  // Resources are all in this tenant
  const resourceTenantId = 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

  // Get D rooms for daycare
  const dRooms = await prisma.resource.findMany({
    where: { tenantId: resourceTenantId, name: { startsWith: 'D' } },
    orderBy: { name: 'asc' },
  });
  console.log('D rooms found:', dRooms.length);

  // Get A, B, C rooms for boarding
  const abcRooms = await prisma.resource.findMany({
    where: {
      tenantId: resourceTenantId,
      OR: [
        { name: { startsWith: 'A' } },
        { name: { startsWith: 'B' } },
        { name: { startsWith: 'C' } },
      ],
    },
    orderBy: { name: 'asc' },
  });
  console.log('A/B/C rooms found:', abcRooms.length);

  // Get ALL DAYCARE service IDs (across all tenants)
  const daycareServices = await prisma.service.findMany({
    where: { serviceCategory: 'DAYCARE' },
    select: { id: true },
  });
  const daycareServiceIds = daycareServices.map((s) => s.id);
  console.log('Daycare services (all tenants):', daycareServiceIds.length);

  // Get ALL BOARDING service IDs (across all tenants)
  const boardingServices = await prisma.service.findMany({
    where: { serviceCategory: 'BOARDING' },
    select: { id: true },
  });
  const boardingServiceIds = boardingServices.map((s) => s.id);
  console.log('Boarding services (all tenants):', boardingServiceIds.length);

  // Get ALL unassigned daycare reservations (across all tenants)
  const unassignedDaycare = await prisma.reservation.findMany({
    where: {
      resourceId: null,
      serviceId: { in: daycareServiceIds },
    },
    orderBy: { startDate: 'asc' },
  });
  console.log(
    'Unassigned daycare reservations (all tenants):',
    unassignedDaycare.length
  );

  // Get ALL unassigned boarding reservations (across all tenants)
  const unassignedBoarding = await prisma.reservation.findMany({
    where: {
      resourceId: null,
      serviceId: { in: boardingServiceIds },
    },
    orderBy: { startDate: 'asc' },
  });
  console.log(
    'Unassigned boarding reservations (all tenants):',
    unassignedBoarding.length
  );

  // Assign daycare to D rooms (round-robin)
  let dIndex = 0;
  for (const res of unassignedDaycare) {
    const room = dRooms[dIndex % dRooms.length];
    await prisma.reservation.update({
      where: { id: res.id },
      data: { resourceId: room.id },
    });
    dIndex++;
    if (dIndex % 1000 === 0) console.log('Assigned', dIndex, 'daycare...');
  }
  console.log('Assigned', dIndex, 'daycare reservations to D rooms');

  // Assign boarding to A/B/C rooms (round-robin)
  let abcIndex = 0;
  for (const res of unassignedBoarding) {
    const room = abcRooms[abcIndex % abcRooms.length];
    await prisma.reservation.update({
      where: { id: res.id },
      data: { resourceId: room.id },
    });
    abcIndex++;
    if (abcIndex % 1000 === 0) console.log('Assigned', abcIndex, 'boarding...');
  }
  console.log('Assigned', abcIndex, 'boarding reservations to A/B/C rooms');

  await prisma.$disconnect();
}

assignKennels().catch((e) => {
  console.error(e);
  process.exit(1);
});
