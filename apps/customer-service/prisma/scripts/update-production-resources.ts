/**
 * Production Resource Update Script
 *
 * Run on production server:
 * cd /opt/tailtown/services/customer
 * npx ts-node prisma/scripts/update-production-resources.ts
 *
 * This script:
 * 1. Lists existing resources
 * 2. Updates their type and price based on name patterns
 * 3. Creates services if they don't exist
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pricing configuration
const PRICING = {
  JUNIOR_KENNEL: 45.0,
  QUEEN_KENNEL: 55.0,
  KING_KENNEL: 75.0,
  VIP_ROOM: 95.0,
  CAT_CONDO: 35.0,
  DAY_CAMP_FULL: 40.0,
  DAY_CAMP_HALF: 25.0,
};

// Map resource name patterns to types
function getResourceTypeFromName(
  name: string
): { type: string; price: number } | null {
  const lowerName = name.toLowerCase();

  // Junior kennels - names containing "junior" or specific patterns
  if (lowerName.includes('junior')) {
    return { type: 'JUNIOR_KENNEL', price: PRICING.JUNIOR_KENNEL };
  }

  // Queen kennels
  if (lowerName.includes('queen')) {
    return { type: 'QUEEN_KENNEL', price: PRICING.QUEEN_KENNEL };
  }

  // King kennels
  if (lowerName.includes('king')) {
    return { type: 'KING_KENNEL', price: PRICING.KING_KENNEL };
  }

  // VIP rooms
  if (lowerName.includes('vip')) {
    return { type: 'VIP_ROOM', price: PRICING.VIP_ROOM };
  }

  // Cat condos
  if (
    lowerName.includes('cat') ||
    lowerName.includes('condo') ||
    lowerName.includes('feline')
  ) {
    return { type: 'CAT_CONDO', price: PRICING.CAT_CONDO };
  }

  // Day camp
  if (lowerName.includes('day camp') || lowerName.includes('daycamp')) {
    if (lowerName.includes('half')) {
      return { type: 'DAY_CAMP_HALF', price: PRICING.DAY_CAMP_HALF };
    }
    return { type: 'DAY_CAMP_FULL', price: PRICING.DAY_CAMP_FULL };
  }

  return null;
}

async function listResources() {
  console.log('\n📋 Current Resources:\n');

  const resources = await prisma.resource.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      price: true,
      tenantId: true,
      isActive: true,
    },
  });

  console.log('ID | Name | Type | Price | Tenant | Active');
  console.log('-'.repeat(80));

  for (const r of resources) {
    const suggestedType = getResourceTypeFromName(r.name);
    const needsUpdate =
      suggestedType &&
      (r.type !== suggestedType.type || r.price !== suggestedType.price);
    const marker = needsUpdate ? ' ⚠️ NEEDS UPDATE' : '';
    console.log(
      `${r.id.substring(0, 20)}... | ${r.name} | ${r.type} | $${
        r.price || 'null'
      } | ${r.tenantId} | ${r.isActive}${marker}`
    );
  }

  return resources;
}

async function updateResources(dryRun = true) {
  console.log(`\n${dryRun ? '🔍 DRY RUN - ' : ''}Updating resources...\n`);

  const resources = await prisma.resource.findMany({
    select: { id: true, name: true, type: true, price: true, tenantId: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const resource of resources) {
    const mapping = getResourceTypeFromName(resource.name);

    if (!mapping) {
      console.log(`⏭️  Skipping "${resource.name}" - no mapping found`);
      skipped++;
      continue;
    }

    const needsTypeUpdate = resource.type !== mapping.type;
    const needsPriceUpdate = resource.price !== mapping.price;

    if (!needsTypeUpdate && !needsPriceUpdate) {
      console.log(
        `✅ "${resource.name}" already correct (${mapping.type}, $${mapping.price})`
      );
      continue;
    }

    console.log(
      `🔄 "${resource.name}": ${resource.type} → ${mapping.type}, $${
        resource.price || 'null'
      } → $${mapping.price}`
    );

    if (!dryRun) {
      await prisma.resource.update({
        where: { id: resource.id },
        data: {
          type: mapping.type as any,
          price: mapping.price,
          taxable: true,
        },
      });
    }

    updated++;
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'}: ${updated} resources`);
  console.log(`Skipped: ${skipped} resources (no mapping)`);
}

async function ensureServices(tenantId: string, dryRun = true) {
  console.log(
    `\n${
      dryRun ? '🔍 DRY RUN - ' : ''
    }Ensuring services for tenant: ${tenantId}\n`
  );

  const services = [
    {
      name: 'Indoor Suite',
      description: 'Standard indoor boarding for dogs',
      duration: 1440,
      price: 50.0,
      serviceCategory: 'BOARDING',
      color: '#4CAF50',
    },
    {
      name: 'King Suite',
      description: 'Premium boarding with extra space for large dogs',
      duration: 1440,
      price: 75.0,
      serviceCategory: 'BOARDING',
      color: '#2196F3',
    },
    {
      name: 'VIP Suite',
      description: 'Luxury private room with premium amenities',
      duration: 1440,
      price: 95.0,
      serviceCategory: 'BOARDING',
      color: '#9C27B0',
    },
    {
      name: 'Cat Boarding',
      description: 'Comfortable condo for feline guests',
      duration: 1440,
      price: 35.0,
      serviceCategory: 'BOARDING',
      color: '#FF9800',
    },
    {
      name: 'Day Camp Full Day',
      description: 'Full day of supervised play and socialization',
      duration: 480,
      price: 40.0,
      serviceCategory: 'DAYCARE',
      color: '#00BCD4',
    },
    {
      name: 'Day Camp Half Day',
      description: 'Half day of supervised play and socialization',
      duration: 240,
      price: 25.0,
      serviceCategory: 'DAYCARE',
      color: '#009688',
    },
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { tenantId, name: service.name },
    });

    if (existing) {
      console.log(`✅ Service "${service.name}" already exists`);
    } else {
      console.log(`➕ Creating service "${service.name}"`);

      if (!dryRun) {
        await prisma.service.create({
          data: {
            id: `${tenantId}-${service.name
              .toLowerCase()
              .replace(/\s+/g, '-')}`,
            tenantId,
            ...service,
            serviceCategory: service.serviceCategory as any,
          },
        });
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  const dryRun = !args.includes('--execute');

  console.log('='.repeat(60));
  console.log('Production Resource Update Script');
  console.log('='.repeat(60));

  try {
    switch (command) {
      case 'list':
        await listResources();
        console.log(
          '\nTo update resources, run: npx ts-node prisma/scripts/update-production-resources.ts update'
        );
        break;

      case 'update':
        if (dryRun) {
          console.log('\n⚠️  DRY RUN MODE - No changes will be made');
          console.log('Add --execute flag to apply changes\n');
        }
        await listResources();
        await updateResources(dryRun);

        // Get unique tenant IDs
        const resources = await prisma.resource.findMany({
          select: { tenantId: true },
        });
        const tenantIds = [...new Set(resources.map((r) => r.tenantId))];

        for (const tenantId of tenantIds) {
          await ensureServices(tenantId, dryRun);
        }

        if (dryRun) {
          console.log('\n✅ Dry run complete. To apply changes, run:');
          console.log(
            'npx ts-node prisma/scripts/update-production-resources.ts update --execute'
          );
        } else {
          console.log('\n✅ Update complete!');
        }
        break;

      default:
        console.log('Usage:');
        console.log(
          '  npx ts-node prisma/scripts/update-production-resources.ts list'
        );
        console.log(
          '  npx ts-node prisma/scripts/update-production-resources.ts update'
        );
        console.log(
          '  npx ts-node prisma/scripts/update-production-resources.ts update --execute'
        );
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
