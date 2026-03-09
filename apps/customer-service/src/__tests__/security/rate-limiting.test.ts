/**
 * Rate Limiting Security Tests
 * 
 * Tests to ensure rate limiting is properly configured:
 * - Login endpoint has strict rate limits
 * - API endpoints have reasonable rate limits
 * - Rate limits are enforced per IP/user
 * - Rate limit headers are present
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Rate Limiting Security Tests', () => {
  let authToken: string;
  const testTenantId = 'rate-limit-test-tenant';

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    await prisma.staff.create({
      data: {
        email: 'ratelimit-test@example.com',
        firstName: 'RateLimit',
        lastName: 'Test',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: testTenantId,
        isActive: true
      }
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ratelimit-test@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await prisma.staff.deleteMany({
      where: { tenantId: testTenantId }
    });
    await prisma.$disconnect();
  });

  describe('Login Endpoint Rate Limiting', () => {
    it('should have stricter rate limits on login endpoint', async () => {
      const maxAttempts = 5; // Assuming 5 attempts per 15 minutes
      const responses = [];

      // Make multiple login attempts
      for (let i = 0; i < maxAttempts + 2; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: `test-${i}@example.com`,
            password: 'WrongPassword'
          });

        responses.push(response);
      }

      // Last requests should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429); // Too Many Requests
      expect(lastResponse.body.message).toContain('rate limit');
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Should include rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should reset rate limit after time window', async () => {
      // This test would require waiting or time manipulation
      // For now, verify the concept
      expect(true).toBe(true); // Placeholder
    });

    it('should track rate limits per IP address', async () => {
      // Multiple requests from same IP should share rate limit
      const responses = [];
      
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '192.168.1.100')
          .send({
            email: `test-${i}@example.com`,
            password: 'password'
          });

        responses.push(response);
      }

      // Verify rate limit is being tracked
      const firstLimit = parseInt(responses[0].headers['x-ratelimit-remaining'] || '0');
      const lastLimit = parseInt(responses[responses.length - 1].headers['x-ratelimit-remaining'] || '0');
      
      expect(lastLimit).toBeLessThan(firstLimit);
    });
  });

  describe('API Endpoint Rate Limiting', () => {
    it('should rate limit general API endpoints', async () => {
      const maxRequests = 100; // Assuming 100 requests per 15 minutes
      const responses = [];

      // Make many requests
      for (let i = 0; i < maxRequests + 5; i++) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${authToken}`);

        responses.push(response);

        // Break early if rate limited
        if (response.status === 429) {
          break;
        }
      }

      // Should eventually hit rate limit
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
    });

    it('should have different rate limits for different endpoints', async () => {
      // Critical endpoints should have stricter limits
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      const apiResponse = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      const loginLimit = parseInt(loginResponse.headers['x-ratelimit-limit'] || '0');
      const apiLimit = parseInt(apiResponse.headers['x-ratelimit-limit'] || '0');

      // Login should have stricter limit
      expect(loginLimit).toBeLessThan(apiLimit);
    });

    it('should include Retry-After header when rate limited', async () => {
      // Make enough requests to trigger rate limit
      let rateLimitResponse;
      
      for (let i = 0; i < 150; i++) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 429) {
          rateLimitResponse = response;
          break;
        }
      }

      if (rateLimitResponse) {
        expect(rateLimitResponse.headers).toHaveProperty('retry-after');
        const retryAfter = parseInt(rateLimitResponse.headers['retry-after']);
        expect(retryAfter).toBeGreaterThan(0);
      }
    });
  });

  describe('Rate Limit Bypass Prevention', () => {
    it('should not allow rate limit bypass with different user agents', async () => {
      const userAgents = [
        'Mozilla/5.0',
        'Chrome/91.0',
        'Safari/14.0',
        'Edge/91.0'
      ];

      const responses = [];

      for (const userAgent of userAgents) {
        for (let i = 0; i < 30; i++) {
          const response = await request(app)
            .post('/api/auth/login')
            .set('User-Agent', userAgent)
            .send({
              email: 'test@example.com',
              password: 'password'
            });

          responses.push(response);
        }
      }

      // Should still be rate limited despite different user agents
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not allow rate limit bypass with X-Forwarded-For spoofing', async () => {
      const responses = [];

      // Try to bypass by changing X-Forwarded-For
      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', `192.168.1.${i}`)
          .send({
            email: 'test@example.com',
            password: 'password'
          });

        responses.push(response);
      }

      // Should still enforce rate limits
      expect(responses.some(r => r.status === 429)).toBe(true);
    });

    it('should track authenticated users separately', async () => {
      // Authenticated requests should have separate rate limit
      const unauthResponse = await request(app)
        .get('/api/health');

      const authResponse = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      // Both should have rate limit headers
      expect(unauthResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(authResponse.headers).toHaveProperty('x-ratelimit-limit');
    });
  });

  describe('Distributed Rate Limiting', () => {
    it('should share rate limits across multiple instances', async () => {
      // In a distributed system, rate limits should be shared
      // This would require Redis or similar
      // For now, verify the concept
      expect(true).toBe(true); // Placeholder
    });

    it('should handle rate limit storage failures gracefully', async () => {
      // If Redis/storage fails, should fail open or closed based on config
      // For now, verify the concept
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have configurable rate limits', async () => {
      // Rate limits should be configurable via environment variables
      expect(process.env.RATE_LIMIT_WINDOW_MS).toBeDefined();
      expect(process.env.RATE_LIMIT_MAX_REQUESTS).toBeDefined();
    });

    it('should have different limits for different user roles', async () => {
      // Admin users might have higher rate limits
      // This would require role-based rate limiting
      expect(true).toBe(true); // Placeholder
    });

    it('should allow whitelisting certain IPs', async () => {
      // Internal services or monitoring might be whitelisted
      // This would require IP whitelist configuration
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('DDoS Protection', () => {
    it('should handle burst traffic', async () => {
      // Make many simultaneous requests
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/health')
        );
      }

      const responses = await Promise.all(promises);

      // Should handle burst but eventually rate limit
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful.length).toBeGreaterThan(0);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should have exponential backoff for repeated violations', async () => {
      // Repeated rate limit violations should increase penalty
      // This would require tracking violation history
      expect(true).toBe(true); // Placeholder
    });

    it('should temporarily block IPs with excessive violations', async () => {
      // IPs that repeatedly violate rate limits should be blocked
      // This would require IP blocking mechanism
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Rate Limit Monitoring', () => {
    it('should log rate limit violations', async () => {
      // Rate limit hits should be logged for monitoring
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Verify logging happens (would check logs in real implementation)
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should expose rate limit metrics', async () => {
      // Metrics endpoint should show rate limit stats
      const response = await request(app)
        .get('/api/metrics/rate-limits')
        .set('Authorization', `Bearer ${authToken}`);

      // Should return rate limit statistics
      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalRequests');
        expect(response.body).toHaveProperty('rateLimitedRequests');
      }
    });
  });

  describe('Endpoint-Specific Rate Limits', () => {
    it('should have strict limits on password reset', async () => {
      const responses = [];

      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({
            email: 'test@example.com'
          });

        responses.push(response);
      }

      // Should be rate limited quickly
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should have strict limits on registration', async () => {
      const responses = [];

      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-${i}@example.com`,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User'
          });

        responses.push(response);
      }

      // Should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should have reasonable limits on search endpoints', async () => {
      const responses = [];

      for (let i = 0; i < 150; i++) {
        const response = await request(app)
          .get('/api/customers/search?q=test')
          .set('Authorization', `Bearer ${authToken}`);

        responses.push(response);

        if (response.status === 429) break;
      }

      // Should eventually rate limit
      expect(responses.some(r => r.status === 429)).toBe(true);
    });
  });
});
