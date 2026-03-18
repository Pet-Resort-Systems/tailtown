#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Common vaccines for dogs and cats
const DOG_VACCINES = [
  'Rabies',
  'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
  'Bordetella',
  'Leptospirosis',
  'Canine Influenza',
];

const CAT_VACCINES = [
  'Rabies',
  'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
  'FeLV (Feline Leukemia)',
  'Bordetella',
];

function getRandomFutureDate(minMonths = 3, maxMonths = 18) {
  const now = new Date();
  const months =
    Math.floor(Math.random() * (maxMonths - minMonths + 1)) + minMonths;
  const futureDate = new Date(now);
  futureDate.setMonth(futureDate.getMonth() + months);
  return futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function getRandomPastDate(minMonths = 1, maxMonths = 12) {
  const now = new Date();
  const months =
    Math.floor(Math.random() * (maxMonths - minMonths + 1)) + minMonths;
  const pastDate = new Date(now);
  pastDate.setMonth(pastDate.getMonth() - months);
  return pastDate.toISOString().split('T')[0];
}

async function updateVaccineStatus(tenantSubdomain, percentCurrent = 90) {
  try {
    console.log(
      `\n💉 Updating vaccine status for ${tenantSubdomain} tenant...\n`
    );
    console.log(`Setting ${percentCurrent}% of pets as current on vaccines\n`);

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSubdomain },
    });

    if (!tenant) {
      console.error(`❌ Tenant '${tenantSubdomain}' not found`);
      process.exit(1);
    }

    // Get all pets for this tenant
    const pets = await prisma.pet.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: 'asc' },
    });

    console.log(`Found ${pets.length} pets\n`);

    let updated = 0;

    for (const pet of pets) {
      // Determine if this pet should be current (based on percentage)
      const isCurrent = Math.random() * 100 < percentCurrent;

      // Select appropriate vaccines based on pet type
      const vaccines =
        pet.type === 'DOG'
          ? DOG_VACCINES
          : pet.type === 'CAT'
            ? CAT_VACCINES
            : ['Rabies']; // Default for other types

      // Create vaccination status and expirations with correct logic
      const vaccinationStatus = {};
      const vaccineExpirations = {};

      vaccines.forEach((vaccine) => {
        if (isCurrent) {
          // Future date = current status
          vaccineExpirations[vaccine] = getRandomFutureDate(3, 18);
          vaccinationStatus[vaccine] = 'current';
        } else {
          // Randomly assign expired or pending
          const isPending = Math.random() > 0.5;
          if (isPending) {
            // No date = pending status
            vaccinationStatus[vaccine] = 'pending';
            // Don't set expiration date for pending
          } else {
            // Past date = expired status
            vaccineExpirations[vaccine] = getRandomPastDate(1, 12);
            vaccinationStatus[vaccine] = 'expired';
          }
        }
      });

      // Update the pet
      await prisma.pet.update({
        where: { id: pet.id },
        data: {
          vaccinationStatus,
          vaccineExpirations,
        },
      });

      const status = isCurrent ? '✅ CURRENT' : '⚠️  EXPIRED';
      const nextExpiry = isCurrent
        ? `expires ${vaccineExpirations[vaccines[0]]}`
        : `expired ${vaccineExpirations[vaccines[0]]}`;

      console.log(
        `${status} ${pet.name} (${pet.type}): ${vaccines.length} vaccines, ${nextExpiry}`
      );
      updated++;
    }

    const currentCount = Math.round((pets.length * percentCurrent) / 100);
    const expiredCount = pets.length - currentCount;

    console.log(`\n✅ Updated ${updated} pets!`);
    console.log(`   📊 ~${currentCount} current, ~${expiredCount} expired`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1 || args.length > 2) {
  console.log(
    'Usage: node update-vaccine-status.js <tenant-subdomain> [percent-current]'
  );
  console.log('Example: node update-vaccine-status.js rainy 90');
  console.log('Default: 90% current');
  process.exit(1);
}

const tenantSubdomain = args[0];
const percentCurrent = args[1] ? parseInt(args[1]) : 90;

if (percentCurrent < 0 || percentCurrent > 100) {
  console.error('❌ Percent must be between 0 and 100');
  process.exit(1);
}

updateVaccineStatus(tenantSubdomain, percentCurrent);
