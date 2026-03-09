/**
 * Integration Test Setup
 * Configures environment for integration tests with real database
 */

// @ts-nocheck - Jest globals
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/reservation';
process.env.PORT = '4099'; // Use different port for tests

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Starting integration tests...');
  console.log(`📊 Database: ${process.env.DATABASE_URL}`);
});

afterAll(async () => {
  console.log('✅ Integration tests complete');
});
