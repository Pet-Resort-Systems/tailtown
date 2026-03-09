// Jest setup file - runs before all tests
require('dotenv').config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.PORT = '4005'; // Use different port for tests to avoid conflicts

// Set test database URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/customer_test';
}

// Set test timeout for database operations
jest.setTimeout(30000); // 30 seconds for database operations
