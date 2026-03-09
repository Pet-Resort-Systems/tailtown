/**
 * Database Connection Health Tests
 * 
 * These tests validate that the database connection is properly configured
 * and that we can connect successfully.
 * 
 * These would have caught:
 * - Database user 'root' does not exist
 * - Connection string issues
 * - Missing database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Connection Health', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Connection Tests', () => {
    it('should connect to database successfully', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    it('should be able to query database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should have correct database name', async () => {
      const result = await prisma.$queryRaw<Array<{ current_database: string }>>`
        SELECT current_database();
      `;
      
      expect(result[0].current_database).toBeDefined();
      
      // In CI, should be 'customer' database
      if (process.env.CI) {
        expect(result[0].current_database).toBe('customer');
      }
    });

    it('should have correct database user', async () => {
      const result = await prisma.$queryRaw<Array<{ current_user: string }>>`
        SELECT current_user;
      `;
      
      expect(result[0].current_user).toBeDefined();
      
      // Should NOT be 'root' (common error in CI)
      expect(result[0].current_user).not.toBe('root');
      
      // In CI, should be 'postgres'
      if (process.env.CI) {
        expect(result[0].current_user).toBe('postgres');
      }
    });

    it('should have correct schema', async () => {
      const result = await prisma.$queryRaw<Array<{ current_schema: string }>>`
        SELECT current_schema();
      `;
      
      expect(result[0].current_schema).toBe('public');
    });
  });

  describe('Database Configuration', () => {
    it('should have DATABASE_URL environment variable', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });

    it('should have valid PostgreSQL connection string', () => {
      const dbUrl = process.env.DATABASE_URL || '';
      
      expect(dbUrl).toMatch(/^postgresql:\/\//);
      expect(dbUrl).toContain('@');
      expect(dbUrl).toContain('/');
    });

    it('should connect to correct port', async () => {
      const dbUrl = process.env.DATABASE_URL || '';
      
      // Extract port from connection string
      const portMatch = dbUrl.match(/:(\d+)\//);
      
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        
        // In CI, should be 5432 (default PostgreSQL port)
        // In dev, might be 5433
        expect([5432, 5433]).toContain(port);
      }
    });
  });

  describe('Database Permissions', () => {
    it('should be able to create tables', async () => {
      // Try to create a test table
      await expect(
        prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS _test_permissions (
            id SERIAL PRIMARY KEY,
            test_column TEXT
          );
        `
      ).resolves.not.toThrow();
      
      // Clean up
      await prisma.$executeRaw`DROP TABLE IF EXISTS _test_permissions;`;
    });

    it('should be able to insert data', async () => {
      // Create test table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS _test_insert (
          id SERIAL PRIMARY KEY,
          test_data TEXT
        );
      `;
      
      // Try to insert
      await expect(
        prisma.$executeRaw`
          INSERT INTO _test_insert (test_data) VALUES ('test');
        `
      ).resolves.not.toThrow();
      
      // Clean up
      await prisma.$executeRaw`DROP TABLE IF EXISTS _test_insert;`;
    });

    it('should be able to query data', async () => {
      const result = await prisma.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        LIMIT 1;
      `;
      
      expect(result).toBeDefined();
    });
  });

  describe('Migration State', () => {
    it('should have _prisma_migrations table', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = '_prisma_migrations';
      `;
      
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should have applied migrations', async () => {
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name 
        FROM _prisma_migrations 
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC;
      `;
      
      expect(migrations.length).toBeGreaterThan(0);
    });

    it('should not have failed migrations', async () => {
      const failedMigrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name 
        FROM _prisma_migrations 
        WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;
      `;
      
      expect(failedMigrations.length).toBe(0);
    });
  });

  describe('Performance Checks', () => {
    it('should respond to queries quickly', async () => {
      const start = Date.now();
      
      await prisma.$queryRaw`SELECT 1`;
      
      const duration = Date.now() - start;
      
      // Should respond in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent connections', async () => {
      const queries = Array(5).fill(null).map(() => 
        prisma.$queryRaw`SELECT 1`
      );
      
      await expect(Promise.all(queries)).resolves.not.toThrow();
    });
  });
});
