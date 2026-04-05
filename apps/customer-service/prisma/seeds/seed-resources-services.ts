/**
 * Seed script for Resources and Services
 *
 * Run with: npx ts-node prisma/seeds/seed-resources-services.ts
 *
 * Creates:
 * - Dog boarding kennels (Junior, Queen, King, VIP)
 * - Cat condos
 * - Day camp resources
 * - Corresponding services
 */

import { prisma } from '../../src/config/prisma';
import { env } from '../../src/env.js';

const TENANT_ID = env.TENANT_ID || 'dev';

// Pricing configuration (adjust as needed)
const PRICING = {
  JUNIOR_KENNEL: 45.0,
  QUEEN_KENNEL: 55.0,
  KING_KENNEL: 75.0,
  VIP_ROOM: 95.0,
  CAT_CONDO: 35.0,
  DAY_CAMP_FULL: 40.0,
  DAY_CAMP_HALF: 25.0,
};

async function seedServices() {
  console.log('Seeding services...');

  const services = [
    {
      name: 'Indoor Suite',
      description: 'Standard indoor boarding for dogs',
      duration: 1440, // 24 hours in minutes
      price: 50.0, // Base price (actual price comes from resource)
      serviceCategory: 'BOARDING' as const,
      color: '#4CAF50',
    },
    {
      name: 'King Suite',
      description: 'Premium boarding with extra space for large dogs',
      duration: 1440,
      price: 75.0,
      serviceCategory: 'BOARDING' as const,
      color: '#2196F3',
    },
    {
      name: 'VIP Suite',
      description: 'Luxury private room with premium amenities',
      duration: 1440,
      price: 95.0,
      serviceCategory: 'BOARDING' as const,
      color: '#9C27B0',
    },
    {
      name: 'Cat Boarding',
      description: 'Comfortable condo for feline guests',
      duration: 1440,
      price: 35.0,
      serviceCategory: 'BOARDING' as const,
      color: '#FF9800',
    },
    {
      name: 'Day Camp Full Day',
      description: 'Full day of supervised play and socialization',
      duration: 480, // 8 hours
      price: 40.0,
      serviceCategory: 'DAYCARE' as const,
      color: '#00BCD4',
    },
    {
      name: 'Day Camp Half Day',
      description: 'Half day of supervised play and socialization',
      duration: 240, // 4 hours
      price: 25.0,
      serviceCategory: 'DAYCARE' as const,
      color: '#009688',
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: {
        id: `${TENANT_ID}-${service.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: service,
      create: {
        id: `${TENANT_ID}-${service.name.toLowerCase().replace(/\s+/g, '-')}`,
        tenantId: TENANT_ID,
        ...service,
      },
    });
    console.log(`  Created/updated service: ${service.name}`);
  }
}

async function seedResources() {
  console.log('Seeding resources...');

  const resources: Array<{
    name: string;
    type: string;
    price: number;
    suiteNumber?: number;
  }> = [];

  // Junior Kennels (1-6)
  for (let i = 1; i <= 6; i++) {
    resources.push({
      name: `Junior ${i}`,
      type: 'JUNIOR_KENNEL',
      price: PRICING.JUNIOR_KENNEL,
      suiteNumber: i,
    });
  }

  // Queen Kennels (7-12)
  for (let i = 7; i <= 12; i++) {
    resources.push({
      name: `Queen ${i}`,
      type: 'QUEEN_KENNEL',
      price: PRICING.QUEEN_KENNEL,
      suiteNumber: i,
    });
  }

  // King Kennels (13-18)
  for (let i = 13; i <= 18; i++) {
    resources.push({
      name: `King ${i}`,
      type: 'KING_KENNEL',
      price: PRICING.KING_KENNEL,
      suiteNumber: i,
    });
  }

  // VIP Rooms (1-3)
  for (let i = 1; i <= 3; i++) {
    resources.push({
      name: `VIP ${i}`,
      type: 'VIP_ROOM',
      price: PRICING.VIP_ROOM,
      suiteNumber: 100 + i, // VIP rooms start at 101
    });
  }

  // Cat Condos (1-12)
  for (let i = 1; i <= 12; i++) {
    resources.push({
      name: `Cat Condo ${i}`,
      type: 'CAT_CONDO',
      price: PRICING.CAT_CONDO,
      suiteNumber: 200 + i, // Cat condos start at 201
    });
  }

  // Day Camp resources (virtual slots for capacity tracking)
  resources.push({
    name: 'Day Camp Full Day',
    type: 'DAY_CAMP_FULL',
    price: PRICING.DAY_CAMP_FULL,
  });
  resources.push({
    name: 'Day Camp Half Day',
    type: 'DAY_CAMP_HALF',
    price: PRICING.DAY_CAMP_HALF,
  });

  for (const resource of resources) {
    const id = `${TENANT_ID}-${resource.name
      .toLowerCase()
      .replace(/\s+/g, '-')}`;
    await prisma.resource.upsert({
      where: { id },
      update: {
        price: resource.price,
        type: resource.type as any,
      },
      create: {
        id,
        tenantId: TENANT_ID,
        name: resource.name,
        type: resource.type as any,
        price: resource.price,
        suiteNumber: resource.suiteNumber,
        capacity: resource.type.startsWith('DAY_CAMP') ? 20 : 1, // Day camp has higher capacity
        isActive: true,
      },
    });
    console.log(
      `  Created/updated resource: ${resource.name} ($${resource.price})`
    );
  }
}

async function main() {
  console.log(`\nSeeding database for tenant: ${TENANT_ID}\n`);

  try {
    await seedServices();
    console.log('');
    await seedResources();
    console.log('\n✅ Seeding complete!\n');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
