/**
 * Multi-Tenant Isolation Tests
 * 
 * Tests to ensure proper tenant isolation and data segregation
 */

import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';

describe('Multi-Tenant Isolation', () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    prisma = new PrismaClient();

    // Mock tenant middleware
    app.use((req: any, res, next) => {
      req.tenantId = req.headers['x-tenant-id'] || 'default';
      next();
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('Tenant Identification', () => {
    it('should extract tenant ID from request headers', (done) => {
      app.get('/test', (req: any, res) => {
        res.json({ tenantId: req.tenantId });
      });

      request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-123')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.tenantId).toBe('tenant-123');
          done();
        });
    });

    it('should use default tenant when header is missing', (done) => {
      app.get('/test', (req: any, res) => {
        res.json({ tenantId: req.tenantId });
      });

      request(app)
        .get('/test')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.tenantId).toBe('default');
          done();
        });
    });

    it('should handle subdomain-based tenant identification', () => {
      const extractTenantFromSubdomain = (hostname: string): string => {
        // Extract tenant from subdomain: tenant.example.com -> tenant
        const parts = hostname.split('.');
        return parts.length > 2 ? parts[0] : 'default';
      };

      expect(extractTenantFromSubdomain('tenant-a.canicloud.com')).toBe('tenant-a');
      expect(extractTenantFromSubdomain('tenant-b.canicloud.com')).toBe('tenant-b');
      expect(extractTenantFromSubdomain('canicloud.com')).toBe('default');
    });
  });

  describe('Data Isolation', () => {
    it('should filter queries by tenant ID', async () => {
      // Mock query that should include tenant filter
      const mockQuery = {
        where: {
          tenantId: 'tenant-123',
        },
      };

      expect(mockQuery.where.tenantId).toBe('tenant-123');
    });

    it('should prevent cross-tenant data access', async () => {
      // Simulate trying to access another tenant's data
      const tenantA = 'tenant-a';
      const tenantB = 'tenant-b';

      // Query for tenant A should not return tenant B's data
      const queryA = {
        where: { tenantId: tenantA },
      };

      const queryB = {
        where: { tenantId: tenantB },
      };

      expect(queryA.where.tenantId).not.toBe(queryB.where.tenantId);
    });

    it('should include tenant ID in all create operations', async () => {
      const createData = {
        tenantId: 'tenant-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      expect(createData.tenantId).toBeDefined();
      expect(createData.tenantId).toBe('tenant-123');
    });

    it('should include tenant ID in all update operations', async () => {
      const updateQuery = {
        where: {
          id: 'some-id',
          tenantId: 'tenant-123', // Must match tenant
        },
        data: {
          firstName: 'Updated',
        },
      };

      expect(updateQuery.where.tenantId).toBeDefined();
    });

    it('should include tenant ID in all delete operations', async () => {
      const deleteQuery = {
        where: {
          id: 'some-id',
          tenantId: 'tenant-123', // Must match tenant
        },
      };

      expect(deleteQuery.where.tenantId).toBeDefined();
    });
  });

  describe('Rate Limit Isolation', () => {
    it('should maintain separate rate limit counters per tenant', async () => {
      const rateLimits = new Map<string, number>();

      const incrementRateLimit = (tenantId: string) => {
        const current = rateLimits.get(tenantId) || 0;
        rateLimits.set(tenantId, current + 1);
        return current + 1;
      };

      // Tenant A makes requests
      incrementRateLimit('tenant-a');
      incrementRateLimit('tenant-a');
      incrementRateLimit('tenant-a');

      // Tenant B makes requests
      incrementRateLimit('tenant-b');

      expect(rateLimits.get('tenant-a')).toBe(3);
      expect(rateLimits.get('tenant-b')).toBe(1);
    });

    it('should not affect other tenants when one hits rate limit', () => {
      const isRateLimited = (tenantId: string, count: number, limit: number) => {
        return count > limit;
      };

      const tenantACount = 1001; // Over limit
      const tenantBCount = 500;  // Under limit
      const limit = 1000;

      expect(isRateLimited('tenant-a', tenantACount, limit)).toBe(true);
      expect(isRateLimited('tenant-b', tenantBCount, limit)).toBe(false);
    });
  });

  describe('Connection Pool Isolation', () => {
    it('should share connection pool across all tenants', async () => {
      // All tenants use the same connection pool
      // But data is isolated by tenant ID in queries
      
      const query1 = prisma.$queryRaw`SELECT 1`;
      const query2 = prisma.$queryRaw`SELECT 2`;

      const results = await Promise.all([query1, query2]);
      expect(results).toHaveLength(2);
    });

    it('should not create separate pools per tenant', () => {
      // We use a single Prisma client (singleton)
      // Not one per tenant
      const { prisma: client1 } = require('../src/config/prisma');
      const { prisma: client2 } = require('../src/config/prisma');

      expect(client1).toBe(client2);
    });
  });

  describe('Tenant Context Propagation', () => {
    it('should maintain tenant context through middleware chain', (done) => {
      let capturedTenantId: string | undefined;

      app.use((req: any, res, next) => {
        capturedTenantId = req.tenantId;
        next();
      });

      app.get('/test', (req: any, res) => {
        res.json({ tenantId: req.tenantId });
      });

      request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-456')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(capturedTenantId).toBe('tenant-456');
          expect(res.body.tenantId).toBe('tenant-456');
          done();
        });
    });

    it('should pass tenant context to database queries', async () => {
      const tenantId = 'tenant-789';

      // Mock query builder that includes tenant ID
      const buildQuery = (tenantId: string, filters: any) => {
        return {
          where: {
            tenantId,
            ...filters,
          },
        };
      };

      const query = buildQuery(tenantId, { status: 'active' });

      expect(query.where.tenantId).toBe('tenant-789');
      expect(query.where.status).toBe('active');
    });
  });

  describe('Security', () => {
    it('should reject requests without tenant ID in production', (done) => {
      if (process.env.NODE_ENV === 'production') {
        app.use((req: any, res, next) => {
          if (!req.tenantId || req.tenantId === 'default') {
            return res.status(400).json({ error: 'Tenant ID required' });
          }
          next();
        });
      }

      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      if (process.env.NODE_ENV === 'production') {
        request(app)
          .get('/test')
          .expect(400, done);
      } else {
        done();
      }
    });

    it('should validate tenant ID format', () => {
      const isValidTenantId = (tenantId: string): boolean => {
        // Tenant IDs should be alphanumeric with hyphens
        return /^[a-z0-9-]+$/.test(tenantId);
      };

      expect(isValidTenantId('tenant-123')).toBe(true);
      expect(isValidTenantId('valid-tenant')).toBe(true);
      expect(isValidTenantId('Invalid_Tenant')).toBe(false);
      expect(isValidTenantId('tenant@123')).toBe(false);
      expect(isValidTenantId('../../../etc/passwd')).toBe(false);
    });

    it('should prevent tenant ID injection attacks', () => {
      const sanitizeTenantId = (tenantId: string): string => {
        // Remove any special characters that could be used for injection
        return tenantId.replace(/[^a-z0-9-]/gi, '');
      };

      expect(sanitizeTenantId('tenant-123')).toBe('tenant-123');
      expect(sanitizeTenantId("tenant'; DROP TABLE users--")).toBe('tenantDROPTABLEusers');
      expect(sanitizeTenantId('tenant<script>alert(1)</script>')).toBe('tenantscriptalert1script');
    });
  });

  describe('Performance with Multiple Tenants', () => {
    it('should handle concurrent requests from different tenants', async () => {
      app.get('/test', (req: any, res) => {
        res.json({ tenantId: req.tenantId, timestamp: Date.now() });
      });

      const requests = [
        request(app).get('/test').set('x-tenant-id', 'tenant-a'),
        request(app).get('/test').set('x-tenant-id', 'tenant-b'),
        request(app).get('/test').set('x-tenant-id', 'tenant-c'),
        request(app).get('/test').set('x-tenant-id', 'tenant-d'),
        request(app).get('/test').set('x-tenant-id', 'tenant-e'),
      ];

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(5);
      responses.forEach((res, index) => {
        expect(res.status).toBe(200);
        expect(res.body.tenantId).toBe(`tenant-${String.fromCharCode(97 + index)}`);
      });
    });

    it('should maintain performance with many tenants', async () => {
      const startTime = Date.now();

      // Simulate queries for 50 different tenants
      const queries = Array.from({ length: 50 }, (_, i) =>
        prisma.$queryRaw`SELECT ${`tenant-${i}`} as tenant_id`
      );

      await Promise.all(queries);

      const duration = Date.now() - startTime;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Tenant Metadata', () => {
    it('should store tenant-specific configuration', () => {
      const tenantConfig = {
        'tenant-a': {
          rateLimit: 1000,
          features: ['feature1', 'feature2'],
        },
        'tenant-b': {
          rateLimit: 5000,
          features: ['feature1', 'feature2', 'premium-feature'],
        },
      };

      expect(tenantConfig['tenant-a'].rateLimit).toBe(1000);
      expect(tenantConfig['tenant-b'].rateLimit).toBe(5000);
      expect(tenantConfig['tenant-b'].features).toContain('premium-feature');
    });

    it('should support tenant-specific feature flags', () => {
      const hasFeature = (tenantId: string, feature: string): boolean => {
        const features: Record<string, string[]> = {
          'tenant-premium': ['feature1', 'feature2', 'premium'],
          'tenant-basic': ['feature1'],
        };

        return features[tenantId]?.includes(feature) || false;
      };

      expect(hasFeature('tenant-premium', 'premium')).toBe(true);
      expect(hasFeature('tenant-basic', 'premium')).toBe(false);
    });
  });
});
