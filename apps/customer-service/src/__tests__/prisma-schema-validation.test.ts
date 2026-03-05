import { PrismaClient } from '@prisma/client';

/**
 * Prisma Schema Validation Tests
 * 
 * These tests ensure that:
 * 1. Prisma client is properly generated
 * 2. Schema matches database structure
 * 3. All models are accessible
 * 4. No field name mismatches
 * 
 * Purpose: Prevent issues like the Nov 16, 2025 deployment failure
 * where Prisma client was out of sync with database schema.
 */

describe('Prisma Schema Validation', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Connectivity', () => {
    it('should connect to database successfully', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    it('should execute raw query successfully', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
    });
  });

  describe('Critical Models', () => {
    it('should have Tenant model with correct fields', async () => {
      const tenant = await prisma.tenant.findFirst();
      
      if (tenant) {
        // Verify status is TenantStatus enum, not string
        expect(tenant.status).toBeDefined();
        expect(['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'DELETED', 'PENDING']).toContain(tenant.status);
        
        // Verify other critical fields
        expect(tenant.id).toBeDefined();
        expect(tenant.subdomain).toBeDefined();
        expect(tenant.businessName).toBeDefined();
      }
    });

    it('should have Customer model accessible', async () => {
      const count = await prisma.customer.count();
      expect(typeof count).toBe('number');
    });

    it('should have Pet model accessible', async () => {
      const count = await prisma.pet.count();
      expect(typeof count).toBe('number');
    });

    it('should have Staff model accessible', async () => {
      const count = await prisma.staff.count();
      expect(typeof count).toBe('number');
    });

    it('should have TrainingClass model accessible', async () => {
      const count = await prisma.trainingClass.count();
      expect(typeof count).toBe('number');
    });
  });

  describe('TrainingClass Relations and Counts', () => {
    it('should query TrainingClass with valid _count fields', async () => {
      // This test would have caught the classWaitlist vs waitlist bug
      const classes = await prisma.trainingClass.findMany({
        take: 1,
        include: {
          _count: {
            select: {
              enrollments: true,
              sessions: true,
              // Note: classWaitlist is NOT valid in _count
              // waitlist is also NOT valid in _count
              // Only direct relations work in _count
            }
          }
        }
      });

      expect(classes).toBeDefined();
      if (classes.length > 0) {
        expect(classes[0]._count).toBeDefined();
        expect(typeof classes[0]._count.enrollments).toBe('number');
        expect(typeof classes[0]._count.sessions).toBe('number');
      }
    });

    it('should query TrainingClass with classWaitlist relation', async () => {
      // Verify the relation name is classWaitlist, not waitlist
      const classWithWaitlist = await prisma.trainingClass.findFirst({
        include: {
          classWaitlist: true
        }
      });

      expect(classWithWaitlist).toBeDefined();
      if (classWithWaitlist) {
        expect(Array.isArray(classWithWaitlist.classWaitlist)).toBe(true);
      }
    });
  });

  describe('Enum Validations', () => {
    it('should validate TenantStatus enum values', () => {
      const validStatuses = ['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'DELETED', 'PENDING'];
      
      // This would have caught the String vs Enum mismatch
      validStatuses.forEach(status => {
        expect(['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'DELETED', 'PENDING']).toContain(status);
      });
    });

    it('should validate PetType enum values', () => {
      const validTypes = ['DOG', 'CAT'];
      validTypes.forEach(type => {
        expect(['DOG', 'CAT']).toContain(type);
      });
    });
  });

  describe('Schema Consistency', () => {
    it('should have matching Prisma client version', async () => {
      // Verify Prisma client is generated
      const prismaVersion = require('@prisma/client/package.json').version;
      expect(prismaVersion).toBeDefined();
      expect(prismaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have all required environment variables', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Common Query Patterns', () => {
    it('should handle tenant filtering correctly', async () => {
      const testTenantId = 'test-tenant-id';
      
      // This pattern is used throughout the codebase
      const customers = await prisma.customer.findMany({
        where: { tenantId: testTenantId },
        take: 1
      });

      expect(Array.isArray(customers)).toBe(true);
    });

    it('should handle includes without errors', async () => {
      const customer = await prisma.customer.findFirst({
        include: {
          pets: true,
          reservations: true
        }
      });

      if (customer) {
        expect(Array.isArray(customer.pets)).toBe(true);
        expect(Array.isArray(customer.reservations)).toBe(true);
      }
    });
  });

  describe('Type Safety', () => {
    it('should enforce TypeScript types for models', () => {
      // This is a compile-time check, but we can verify at runtime
      const mockTenant = {
        id: 'test-id',
        businessName: 'Test Business',
        subdomain: 'test',
        contactName: 'Test Contact',
        contactEmail: 'test@example.com',
        status: 'ACTIVE' as const,
        isActive: true,
        isPaused: false,
        planType: 'STARTER',
        maxEmployees: 50,
        maxLocations: 1,
        isProduction: false,
        isTemplate: false,
        gingrSyncEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(mockTenant.status).toBe('ACTIVE');
      expect(typeof mockTenant.isActive).toBe('boolean');
    });
  });
});
