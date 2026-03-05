import { PrismaClient } from '@prisma/client';

/**
 * Service Health Check Tests
 * 
 * These tests verify that the service can start and operate correctly.
 * Run these tests before deployment to catch configuration issues.
 * 
 * Purpose: Prevent deployment failures by validating service health
 * before code reaches production.
 */

describe('Service Health Checks', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Environment Configuration', () => {
    it('should have DATABASE_URL configured', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toContain('postgresql://');
    });

    it('should have JWT_SECRET configured', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET!.length).toBeGreaterThan(10);
    });

    it('should have NODE_ENV configured', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(['development', 'test', 'production']).toContain(process.env.NODE_ENV);
    });
  });

  describe('Database Health', () => {
    it('should connect to database', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    it('should query database successfully', async () => {
      const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
      expect(result).toBeDefined();
    });

    it('should have required tables', async () => {
      // Verify critical tables exist
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('tenants', 'customers', 'pets', 'staff', 'training_classes')
      `;
      
      expect(tables.length).toBeGreaterThan(0);
      const tableNames = tables.map((t: { tablename: string }) => t.tablename);
      expect(tableNames).toContain('tenants');
      expect(tableNames).toContain('customers');
    });
  });

  describe('Prisma Client Health', () => {
    it('should have Prisma client properly generated', () => {
      expect(prisma).toBeDefined();
      expect(prisma.tenant).toBeDefined();
      expect(prisma.customer).toBeDefined();
      expect(prisma.pet).toBeDefined();
      expect(prisma.staff).toBeDefined();
    });

    it('should have correct Prisma client version', () => {
      const prismaPackage = require('@prisma/client/package.json');
      expect(prismaPackage.version).toBeDefined();
      
      // Verify it's a valid semver
      expect(prismaPackage.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should be able to perform basic CRUD operations', async () => {
      // Test that we can query (even if no results)
      const count = await prisma.tenant.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Model Accessibility', () => {
    const models = [
      'tenant',
      'customer',
      'pet',
      'staff',
      'reservation',
      'service',
      'invoice',
      'payment',
      'trainingClass',
      'classEnrollment',
      'groomerAppointment',
      'reportCard'
    ];

    models.forEach(modelName => {
      it(`should have ${modelName} model accessible`, () => {
        expect((prisma as any)[modelName]).toBeDefined();
        expect(typeof (prisma as any)[modelName].findMany).toBe('function');
        expect(typeof (prisma as any)[modelName].count).toBe('function');
      });
    });
  });

  describe('Critical Queries', () => {
    it('should execute tenant lookup without errors', async () => {
      await expect(
        prisma.tenant.findFirst({
          where: { isActive: true }
        })
      ).resolves.not.toThrow();
    });

    it('should execute customer query with includes', async () => {
      await expect(
        prisma.customer.findFirst({
          include: {
            pets: true
          }
        })
      ).resolves.not.toThrow();
    });

    it('should execute training class query with counts', async () => {
      await expect(
        prisma.trainingClass.findFirst({
          include: {
            _count: {
              select: {
                enrollments: true,
                sessions: true
              }
            }
          }
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      await expect(
        prisma.tenant.findUnique({
          where: { id: 'non-existent-id' }
        })
      ).resolves.toBeNull();
    });

    it('should handle connection errors gracefully', async () => {
      // This tests that Prisma client handles errors without crashing
      const tempPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:5432/invalid'
          }
        }
      });

      await expect(
        tempPrisma.$connect()
      ).rejects.toThrow();

      await tempPrisma.$disconnect();
    });
  });

  describe('Performance', () => {
    it('should execute queries within reasonable time', async () => {
      const start = Date.now();
      await prisma.tenant.count();
      const duration = Date.now() - start;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent queries', async () => {
      const queries = Array(10).fill(null).map(() => 
        prisma.tenant.count()
      );

      await expect(
        Promise.all(queries)
      ).resolves.toBeDefined();
    });
  });
});
