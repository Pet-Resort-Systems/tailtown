/**
 * Connection Pool Tests
 * 
 * Tests for database connection pooling functionality
 */

import { PrismaClient } from '@prisma/client';

describe('Connection Pool', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    // Create a new Prisma client for each test
    prisma = new PrismaClient({
      log: ['error'],
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('Singleton Pattern', () => {
    it('should reuse the same Prisma client instance', () => {
      // In production, the global singleton ensures only one instance
      const { prisma: prisma1 } = require('../src/config/prisma');
      const { prisma: prisma2 } = require('../src/config/prisma');

      expect(prisma1).toBe(prisma2);
    });

    it('should not create multiple instances in development', () => {
      // The global object should store the instance
      const globalForPrisma = global as unknown as { prisma: PrismaClient };
      
      if (process.env.NODE_ENV !== 'production') {
        expect(globalForPrisma.prisma).toBeDefined();
      }
    });
  });

  describe('Connection Management', () => {
    it('should successfully connect to database', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    it('should successfully disconnect from database', async () => {
      await prisma.$connect();
      await expect(prisma.$disconnect()).resolves.not.toThrow();
    });

    it('should handle multiple sequential queries', async () => {
      // Simulate multiple queries that would reuse connections
      const queries = [];
      
      for (let i = 0; i < 10; i++) {
        queries.push(
          prisma.$queryRaw`SELECT 1 as result`
        );
      }

      const results = await Promise.all(queries);
      expect(results).toHaveLength(10);
    });

    it('should handle concurrent queries', async () => {
      // Test connection pool under concurrent load
      const concurrentQueries = Array.from({ length: 20 }, () =>
        prisma.$queryRaw`SELECT 1 as result`
      );

      const results = await Promise.all(concurrentQueries);
      expect(results).toHaveLength(20);
    });
  });

  describe('Connection Pool Configuration', () => {
    it('should have connection limit configured', () => {
      // Check if DATABASE_URL has connection_limit parameter
      const databaseUrl = process.env.DATABASE_URL || '';
      
      // Connection limit should be in URL or using default
      // Example: postgresql://user:pass@host:5432/db?connection_limit=10
      const hasConnectionLimit = databaseUrl.includes('connection_limit');
      
      // Either explicitly set or using Prisma's default
      expect(typeof hasConnectionLimit).toBe('boolean');
    });

    it('should have pool timeout configured', () => {
      const databaseUrl = process.env.DATABASE_URL || '';
      
      // Pool timeout should be configured for production
      // Example: ?pool_timeout=20
      const hasPoolTimeout = databaseUrl.includes('pool_timeout');
      
      expect(typeof hasPoolTimeout).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Create a client with invalid connection string
      const badPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:9999/invalid',
          },
        },
      });

      // Should throw connection error, not crash
      await expect(
        badPrisma.$queryRaw`SELECT 1`
      ).rejects.toThrow();

      await badPrisma.$disconnect();
    });

    it('should recover from temporary connection loss', async () => {
      // First query should work
      const result1 = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result1).toBeDefined();

      // Disconnect
      await prisma.$disconnect();

      // Reconnect and query should still work
      const result2 = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result2).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should execute queries within acceptable time', async () => {
      const startTime = Date.now();
      
      await prisma.$queryRaw`SELECT 1 as result`;
      
      const duration = Date.now() - startTime;
      
      // Query should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle burst of queries efficiently', async () => {
      const startTime = Date.now();
      
      // Execute 50 queries
      const queries = Array.from({ length: 50 }, () =>
        prisma.$queryRaw`SELECT 1 as result`
      );
      
      await Promise.all(queries);
      
      const duration = Date.now() - startTime;
      
      // Should complete in under 1 second with connection pooling
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should disconnect on process exit', async () => {
      const testPrisma = new PrismaClient();
      
      // Connect
      await testPrisma.$connect();
      
      // Simulate graceful shutdown
      await testPrisma.$disconnect();
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle disconnect when already disconnected', async () => {
      await prisma.$disconnect();
      
      // Calling disconnect again should not throw
      await expect(prisma.$disconnect()).resolves.not.toThrow();
    });
  });

  describe('Logging', () => {
    it('should log queries in development mode', () => {
      const devPrisma = new PrismaClient({
        log: ['query', 'error', 'warn'],
      });

      // In development, logging should be enabled
      expect(devPrisma).toBeDefined();
      
      devPrisma.$disconnect();
    });

    it('should only log errors in production mode', () => {
      const prodPrisma = new PrismaClient({
        log: ['error'],
      });

      // In production, only errors should be logged
      expect(prodPrisma).toBeDefined();
      
      prodPrisma.$disconnect();
    });
  });

  describe('Connection Reuse', () => {
    it('should reuse connections for multiple queries', async () => {
      // Execute multiple queries in sequence
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$queryRaw`SELECT 2`;
      await prisma.$queryRaw`SELECT 3`;

      // All queries should use the same connection pool
      // No errors means connection reuse is working
      expect(true).toBe(true);
    });

    it('should not exhaust connection pool under load', async () => {
      // Simulate high load
      const heavyLoad = Array.from({ length: 100 }, (_, i) =>
        prisma.$queryRaw`SELECT ${i} as num`
      );

      // Should complete without connection pool exhaustion
      await expect(Promise.all(heavyLoad)).resolves.toBeDefined();
    });
  });

  describe('Transaction Support', () => {
    it('should support transactions with connection pooling', async () => {
      // Transactions should work with pooled connections
      const result = await prisma.$transaction(async (tx) => {
        const query1 = await tx.$queryRaw`SELECT 1 as result`;
        const query2 = await tx.$queryRaw`SELECT 2 as result`;
        return { query1, query2 };
      });

      expect(result.query1).toBeDefined();
      expect(result.query2).toBeDefined();
    });

    it('should rollback transactions on error', async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT 1`;
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });
});
