/**
 * Jest Integration Test Setup
 *
 * This file exports setup and teardown functions for integration tests.
 * Import and call these in your test files' beforeAll/afterAll hooks.
 */

import {
  getTestPrismaClient,
  resetTestDatabase,
  disconnectTestDatabase,
} from './setup-test-db';

/**
 * Setup function to call in beforeAll
 */
export async function setupIntegrationTests(): Promise<void> {
  console.log('🔧 Setting up test database...');

  // Ensure we're connected
  const prisma = getTestPrismaClient();
  await prisma.$connect();

  // Reset database to clean state
  await resetTestDatabase();

  console.log('✅ Test database ready');
}

/**
 * Teardown function to call in afterAll
 */
export async function teardownIntegrationTests(): Promise<void> {
  console.log('🧹 Cleaning up test database...');
  await disconnectTestDatabase();
  console.log('✅ Test database disconnected');
}
