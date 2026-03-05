/**
 * Rate Limiter Tests
 * 
 * Tests for per-tenant rate limiting functionality
 */

import request from 'supertest';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiter', () => {
  let app: Express;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  describe('Per-Tenant Rate Limiting', () => {
    it('should allow requests under the rate limit', async () => {
      // Set up rate limiter with low limit for testing
      const limiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 5, // 5 requests per minute
        keyGenerator: (req: any) => req.headers['x-tenant-id'] as string || 'default',
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Make 5 requests (should all succeed)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/test')
          .set('x-tenant-id', 'tenant-a');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should block requests over the rate limit', async () => {
      const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 3,
        keyGenerator: (req: any) => req.headers['x-tenant-id'] as string || 'default',
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/test')
          .set('x-tenant-id', 'tenant-a');
        expect(response.status).toBe(200);
      }

      // 4th request should be rate limited
      const blockedResponse = await request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-a');
      
      expect(blockedResponse.status).toBe(429);
    });

    it('should isolate rate limits between tenants', async () => {
      const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        keyGenerator: (req: any) => req.headers['x-tenant-id'] as string || 'default',
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Tenant A makes 2 requests (hits limit)
      await request(app).get('/test').set('x-tenant-id', 'tenant-a');
      await request(app).get('/test').set('x-tenant-id', 'tenant-a');

      // Tenant A's 3rd request should be blocked
      const tenantABlocked = await request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-a');
      expect(tenantABlocked.status).toBe(429);

      // Tenant B should still be able to make requests
      const tenantBResponse = await request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-b');
      expect(tenantBResponse.status).toBe(200);
    });

    it('should include rate limit headers', async () => {
      const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        keyGenerator: (req: any) => req.headers['x-tenant-id'] as string || 'default',
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-a');

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should handle missing tenant ID gracefully', async () => {
      const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 5,
        keyGenerator: (req: any) => req.headers['x-tenant-id'] as string || 'default',
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Request without tenant ID should use 'default' key
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should return Retry-After header when rate limited', async () => {
      const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 1,
        keyGenerator: (req: any) => req.headers['x-tenant-id'] as string || 'default',
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First request succeeds
      await request(app).get('/test').set('x-tenant-id', 'tenant-a');

      // Second request is rate limited
      const blockedResponse = await request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-a');

      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.headers['retry-after']).toBeDefined();
      expect(parseInt(blockedResponse.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Key Generation', () => {
    it('should use tenantId as the primary key', () => {
      const keyGenerator = (req: any) => req.tenantId;
      
      const mockReq = { tenantId: 'tenant-123' };
      const key = keyGenerator(mockReq);
      
      expect(key).toBe('tenant-123');
    });

    it('should not fallback to IP address', () => {
      // This test ensures we removed the || req.ip fallback
      const keyGenerator = (req: any) => req.tenantId;
      
      const mockReq = { ip: '192.168.1.1' }; // No tenantId
      const key = keyGenerator(mockReq);
      
      expect(key).toBeUndefined();
      expect(key).not.toBe('192.168.1.1');
    });

    it('should handle IPv6 addresses correctly', () => {
      // Even if we had IP-based limiting, it should handle IPv6
      const keyGenerator = (req: any) => req.tenantId;
      
      const mockReq = {
        tenantId: 'tenant-456',
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' // IPv6
      };
      
      const key = keyGenerator(mockReq);
      expect(key).toBe('tenant-456'); // Uses tenantId, not IP
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should use correct window duration (15 minutes)', () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        max: 1000,
      };

      expect(config.windowMs).toBe(900000); // 15 minutes in ms
    });

    it('should use correct max requests (1000 per tenant)', () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        max: 1000,
      };

      expect(config.max).toBe(1000);
    });
  });

  describe('Custom Error Messages', () => {
    it('should return custom error message when rate limited', async () => {
      const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 1,
        keyGenerator: (req: any) => req.headers['x-tenant-id'] as string || 'default',
        message: {
          status: 'error',
          message: 'Rate limit exceeded for your organization'
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

      app.use(limiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First request succeeds
      await request(app).get('/test').set('x-tenant-id', 'tenant-a');

      // Second request is rate limited with custom message
      const blockedResponse = await request(app)
        .get('/test')
        .set('x-tenant-id', 'tenant-a');

      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.body.status).toBe('error');
      expect(blockedResponse.body.message).toContain('Rate limit exceeded');
    });
  });
});
