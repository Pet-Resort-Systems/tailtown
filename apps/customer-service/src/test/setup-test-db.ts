/**
 * Test Database Setup
 *
 * This module provides utilities for setting up and tearing down
 * a test database for integration tests.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Use test database URL
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/customer_test';

let prisma: PrismaClient | null = null;

/**
 * Get or create a Prisma client for tests
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
      log: process.env.DEBUG_PRISMA ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Reset the test database by truncating all tables
 * This is faster than dropping and recreating the database
 */
export async function resetTestDatabase(): Promise<void> {
  const client = getTestPrismaClient();

  // Get all table names (excluding Prisma migration tables)
  const tables = await client.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '_prisma%'
  `;

  // Disable foreign key checks and truncate all tables
  await client.$executeRaw`SET session_replication_role = 'replica'`;

  for (const { tablename } of tables) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }

  await client.$executeRaw`SET session_replication_role = 'origin'`;
}

/**
 * Clean up specific tables after a test
 */
export async function cleanupTables(tableNames: string[]): Promise<void> {
  const client = getTestPrismaClient();

  await client.$executeRaw`SET session_replication_role = 'replica'`;

  for (const tableName of tableNames) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
  }

  await client.$executeRaw`SET session_replication_role = 'origin'`;
}

/**
 * Disconnect the test Prisma client
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Create test database if it doesn't exist and run migrations
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    // Push schema to test database (creates tables if they don't exist)
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
      stdio: 'pipe',
    });
    console.log('✅ Test database schema pushed successfully');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Create a test tenant for integration tests
 */
export async function createTestTenant(
  tenantId: string = 'test-tenant'
): Promise<string> {
  const client = getTestPrismaClient();

  const tenant = await client.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      businessName: 'Test Business',
      subdomain: `test-${Date.now()}`,
      contactName: 'Test Contact',
      contactEmail: 'test@example.com',
      contactPhone: '555-0000',
      status: 'ACTIVE',
      isActive: true,
    },
  });

  return tenant.id;
}

/**
 * Create test data for common entities
 */
export async function createTestData(tenantId: string) {
  const client = getTestPrismaClient();

  // Create test customer
  const customer = await client.customer.create({
    data: {
      tenantId,
      firstName: 'Test',
      lastName: 'Customer',
      email: `test-${Date.now()}@example.com`,
      phone: '555-0100',
    },
  });

  // Create test pet
  const pet = await client.pet.create({
    data: {
      tenantId,
      customerId: customer.id,
      name: 'TestPet',
      type: 'DOG',
      breed: 'Test Breed',
    },
  });

  // Create test service
  const service = await client.service.create({
    data: {
      tenantId,
      name: 'Test Service',
      serviceCategory: 'BOARDING',
      price: 50,
      duration: 1440,
      isActive: true,
    },
  });

  // Create test resource
  const resource = await client.resource.create({
    data: {
      tenantId,
      name: 'Test Suite',
      type: 'STANDARD_SUITE',
      isActive: true,
    },
  });

  return { customer, pet, service, resource };
}

/**
 * Delete test data by tenant ID
 */
export async function deleteTestData(tenantId: string): Promise<void> {
  const client = getTestPrismaClient();

  // Delete in reverse order of dependencies
  await client.payment.deleteMany({ where: { invoice: { tenantId } } });
  await client.invoiceLineItem.deleteMany({ where: { invoice: { tenantId } } });
  await client.invoice.deleteMany({ where: { tenantId } });
  await client.reservation.deleteMany({ where: { tenantId } });
  await client.pet.deleteMany({ where: { tenantId } });
  await client.customer.deleteMany({ where: { tenantId } });
  await client.resource.deleteMany({ where: { tenantId } });
  await client.service.deleteMany({ where: { tenantId } });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
