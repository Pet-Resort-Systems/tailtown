#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importLodgingFromCSV(csvPath, tenantId) {
  console.log(`\n🏨 Gingr Lodging Import from CSV`);
  console.log(`═══════════════════════════════════════\n`);
  console.log(`CSV File: ${csvPath}`);
  console.log(`Tenant: ${tenantId}\n`);

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Detect delimiter (tab or comma)
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  console.log(`Detected delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'}\n`);

  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim().replace(/^"|"$/g, ''));
  console.log(`Headers (first 10): ${headers.slice(0, 10).join(', ')}\n`);

  const animalIdx = headers.findIndex(
    (h) => /^a_first$/i.test(h) || /animal|pet/i.test(h)
  );
  const ownerIdx = headers.findIndex(
    (h) => /^o_last$/i.test(h) || /owner|customer/i.test(h)
  );
  const lodgingIdx = headers.findIndex(
    (h) => /^run_name$/i.test(h) || /lodging|kennel|run/i.test(h)
  );
  const startIdx = headers.findIndex(
    (h) => /^start_date$/i.test(h) || /start.*date/i.test(h)
  );

  if (animalIdx === -1 || lodgingIdx === -1) {
    throw new Error(
      `Required columns not found. Need: Animal/Pet and Lodging/Kennel columns`
    );
  }

  console.log(`Column mapping:`);
  console.log(`  Animal: ${headers[animalIdx]} (col ${animalIdx})`);
  console.log(`  Owner: ${headers[ownerIdx]} (col ${ownerIdx})`);
  console.log(`  Lodging: ${headers[lodgingIdx]} (col ${lodgingIdx})`);
  console.log(`  Start Date: ${headers[startIdx]} (col ${startIdx})\n`);

  const stats = {
    total: 0,
    updated: 0,
    notFound: 0,
    noLodging: 0,
    errors: [],
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    stats.total++;
    const cols = line
      .split(delimiter)
      .map((c) => c.trim().replace(/^"|"$/g, ''));

    const petName = cols[animalIdx];
    const ownerName = cols[ownerIdx];
    const lodgingRaw = cols[lodgingIdx];
    const startDate = cols[startIdx];

    if (!lodgingRaw || lodgingRaw === '-' || lodgingRaw === '') {
      stats.noLodging++;
      continue;
    }

    // Normalize lodging: "D. Daycamp D 18" -> "D18"
    const normalized = normalizeLodgingName(lodgingRaw);

    try {
      // Find reservation by pet name, owner, and approximate date
      const reservation = await findReservation(
        tenantId,
        petName,
        ownerName,
        startDate
      );

      if (!reservation) {
        stats.notFound++;
        stats.errors.push(
          `${petName} (${ownerName}) on ${startDate}: not found`
        );
        continue;
      }

      // Find or create resource
      const resource = await findOrCreateResource(
        tenantId,
        normalized,
        lodgingRaw
      );

      // Update reservation
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { resourceId: resource.id },
      });

      stats.updated++;
      console.log(`✓ ${petName} → ${normalized} (${resource.name})`);
    } catch (error) {
      stats.errors.push(`${petName}: ${error.message}`);
    }
  }

  console.log(`\n📊 Import Summary`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Total rows: ${stats.total}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Not found: ${stats.notFound}`);
  console.log(`No lodging: ${stats.noLodging}`);
  console.log(`Errors: ${stats.errors.length}\n`);

  if (stats.errors.length > 0) {
    console.log(`Errors:`);
    stats.errors.slice(0, 20).forEach((e) => console.log(`  - ${e}`));
    if (stats.errors.length > 20) {
      console.log(`  ... and ${stats.errors.length - 20} more`);
    }
  }

  await prisma.$disconnect();
}

function normalizeLodgingName(raw) {
  // "D. Daycamp D 18" -> "D18"
  // "A. Indoor - A 02" -> "A02"
  let normalized = raw
    .replace(/^[A-Z]\.\s*\w+\s*-?\s*/i, '') // Remove "A. Indoor - "
    .replace(/^(Suite|Room|Kennel|Lodging)\s+/i, '')
    .trim();

  normalized = normalized.replace(/^([A-Z])\s+(\d+)$/, '$1$2');

  const match = normalized.match(/^([A-Z])(\d+)$/);
  if (match) {
    const letter = match[1];
    const number = match[2].padStart(2, '0');
    normalized = `${letter}${number}`;
  }

  return normalized;
}

async function findReservation(tenantId, petName, ownerName, startDateStr) {
  // Parse date - handle both "YYYY-MM-DD HH:MM:SS" and "MM/DD/YYYY" formats
  let searchDate;

  // Try ISO format first (from Gingr export: "2025-12-16 06:30:00")
  if (/^\d{4}-\d{2}-\d{2}/.test(startDateStr)) {
    searchDate = new Date(startDateStr.split(' ')[0]);
  } else {
    // Try MM/DD/YYYY format
    const dateMatch = startDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) return null;
    const [_, month, day, year] = dateMatch;
    searchDate = new Date(
      `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    );
  }

  const dayBefore = new Date(searchDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(searchDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  return await prisma.reservation.findFirst({
    where: {
      tenantId,
      pet: {
        name: { contains: petName, mode: 'insensitive' },
      },
      customer: {
        OR: [
          {
            lastName: {
              contains: ownerName.split(' ')[0],
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: ownerName.split(' ')[0],
              mode: 'insensitive',
            },
          },
        ],
      },
      startDate: {
        gte: dayBefore,
        lte: dayAfter,
      },
    },
    include: {
      pet: true,
      customer: true,
    },
  });
}

async function findOrCreateResource(tenantId, normalizedName, originalName) {
  let resource = await prisma.resource.findFirst({
    where: {
      tenantId,
      name: normalizedName,
    },
  });

  if (!resource) {
    const type = determineResourceType(normalizedName);
    resource = await prisma.resource.create({
      data: {
        tenantId,
        name: normalizedName,
        type,
        capacity: type === 'KING_KENNEL' ? 3 : type === 'QUEEN_KENNEL' ? 2 : 1,
        maxPets: type === 'KING_KENNEL' ? 3 : type === 'QUEEN_KENNEL' ? 2 : 1,
        isActive: true,
      },
    });
    console.log(`  Created resource: ${normalizedName} (${type})`);
  }

  return resource;
}

function determineResourceType(name) {
  const upper = name.toUpperCase();
  if (upper.endsWith('K')) return 'KING_KENNEL';
  if (upper.endsWith('Q')) return 'QUEEN_KENNEL';
  if (upper.endsWith('R')) return 'JUNIOR_KENNEL';
  if (upper.startsWith('K') || upper.includes('CAT')) return 'CAT_CONDO';
  return 'STANDARD_SUITE';
}

// CLI
const csvPath = process.argv[2];
const tenantId = process.argv[3] || 'b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05';

if (!csvPath) {
  console.error(
    'Usage: node import-gingr-lodging-csv.js <csv-file> [tenant-id]'
  );
  console.error('\nExample:');
  console.error(
    '  node import-gingr-lodging-csv.js gingr-calendar-2025-12-16.csv'
  );
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`Error: File not found: ${csvPath}`);
  process.exit(1);
}

importLodgingFromCSV(csvPath, tenantId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
