/**
 * API Security Tests
 * 
 * Tests to ensure API security:
 * - CORS policy enforcement
 * - Request size limits
 * - Content-type validation
 * - Malformed JSON handling
 * - API versioning
 * - HTTP method validation
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import app from '../../index';

const prisma = new PrismaClient();

describe('API Security Tests', () => {
  let authToken: string;
  const testTenantId = 'api-security-test-tenant';

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    await prisma.staff.create({
      data: {
        email: 'api-security-test@example.com',
        firstName: 'API',
        lastName: 'Security',
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
        email: 'api-security-test@example.com',
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

  describe('CORS Policy Enforcement', () => {
    it('should include CORS headers for allowed origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Origin', 'http://evil.com')
        .set('Authorization', `Bearer ${authToken}`);

      // Should either not include CORS headers or reject
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('http://evil.com');
      }
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/customers')
        .set('Origin', process.env.CORS_ORIGIN || 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should not allow credentials from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Origin', 'http://evil.com')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.headers['access-control-allow-credentials']) {
        expect(response.headers['access-control-allow-credentials']).toBe('false');
      }
    });

    it('should restrict allowed HTTP methods', async () => {
      const response = await request(app)
        .options('/api/customers')
        .set('Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');

      const allowedMethods = response.headers['access-control-allow-methods'];
      if (allowedMethods) {
        expect(allowedMethods).not.toContain('TRACE');
        expect(allowedMethods).not.toContain('CONNECT');
      }
    });
  });

  describe('Request Size Limits', () => {
    it('should reject requests with payload exceeding size limit', async () => {
      // Create a large payload (>10MB)
      const largePayload = {
        firstName: 'A'.repeat(10 * 1024 * 1024), // 10MB of 'A's
        lastName: 'Test',
        email: 'test@example.com',
        phone: '1234567890'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload);

      expect(response.status).toBe(413); // Payload Too Large
    });

    it('should accept requests within size limit', async () => {
      const normalPayload = {
        firstName: 'John',
        lastName: 'Doe',
        email: `normal-${Date.now()}@example.com`,
        phone: '1234567890'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(normalPayload);

      expect([200, 201]).toContain(response.status);
    });

    it('should limit URL length', async () => {
      const longUrl = '/api/customers?' + 'a=1&'.repeat(10000);

      const response = await request(app)
        .get(longUrl)
        .set('Authorization', `Bearer ${authToken}`);

      expect([414, 400]).toContain(response.status); // URI Too Long or Bad Request
    });

    it('should limit header size', async () => {
      const largeHeader = 'x'.repeat(100000);

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Custom-Header', largeHeader);

      expect([431, 400]).toContain(response.status); // Request Header Fields Too Large
    });
  });

  describe('Content-Type Validation', () => {
    it('should require Content-Type header for POST requests', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send('firstName=John&lastName=Doe'); // Form data instead of JSON

      // Should reject or require application/json
      expect([400, 415]).toContain(response.status);
    });

    it('should accept application/json Content-Type', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `json-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should reject unsupported Content-Types', async () => {
      const unsupportedTypes = [
        'text/plain',
        'text/html',
        'application/xml',
        'multipart/form-data'
      ];

      for (const contentType of unsupportedTypes) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', contentType)
          .send('some data');

        expect([400, 415]).toContain(response.status);
      }
    });

    it('should validate charset in Content-Type', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json; charset=utf-8')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `charset-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Malformed JSON Handling', () => {
    it('should reject invalid JSON syntax', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"firstName": "John", "lastName": }'); // Invalid JSON

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('JSON');
    });

    it('should reject JSON with trailing commas', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"firstName": "John", "lastName": "Doe",}'); // Trailing comma

      expect(response.status).toBe(400);
    });

    it('should reject deeply nested JSON (DoS prevention)', async () => {
      let deeplyNested = '{"a":';
      for (let i = 0; i < 1000; i++) {
        deeplyNested += '{"b":';
      }
      deeplyNested += '1';
      for (let i = 0; i < 1000; i++) {
        deeplyNested += '}';
      }
      deeplyNested += '}';

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(deeplyNested);

      expect([400, 413]).toContain(response.status);
    });

    it('should handle empty JSON body gracefully', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{}');

      expect(response.status).toBe(400); // Missing required fields
      expect(response.body.message).toBeDefined();
    });

    it('should reject non-object JSON at root level', async () => {
      const invalidRoots = [
        '["array", "root"]',
        '"string root"',
        '123',
        'true',
        'null'
      ];

      for (const invalidRoot of invalidRoots) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'application/json')
          .send(invalidRoot);

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/customers/some-id') // If PATCH not supported
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Test' });

      // Should return 405 Method Not Allowed or 404
      expect([404, 405]).toContain(response.status);
    });

    it('should not allow TRACE method', async () => {
      const response = await request(app)
        .trace('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect([405, 501]).toContain(response.status);
    });

    it('should validate method for each endpoint', async () => {
      // GET on a POST-only endpoint
      const response = await request(app)
        .get('/api/auth/login')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('API Versioning', () => {
    it('should include API version in response headers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['x-api-version']).toBeDefined();
    });

    it('should support versioned endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should reject deprecated API versions', async () => {
      const response = await request(app)
        .get('/api/v0/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 410]).toContain(response.status); // Gone
    });

    it('should provide version deprecation warnings', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      // Check for deprecation warning header
      if (response.headers['deprecation']) {
        expect(response.headers['sunset']).toBeDefined();
      }
    });
  });

  describe('Request Validation', () => {
    it('should validate required query parameters', async () => {
      const response = await request(app)
        .get('/api/customers/search') // Missing 'q' parameter
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate query parameter types', async () => {
      const response = await request(app)
        .get('/api/customers?page=invalid&limit=abc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should sanitize query parameters', async () => {
      const response = await request(app)
        .get('/api/customers/search?q=<script>alert("xss")</script>')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(500);
      // Response should not contain unescaped script
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>');
    });

    it('should limit array parameter length', async () => {
      const longArray = Array(1000).fill('id').join(',');
      
      const response = await request(app)
        .get(`/api/customers?ids=${longArray}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Response Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not reveal server details
      if (response.headers['server']) {
        expect(response.headers['server']).not.toContain('Express');
        expect(response.headers['server']).not.toContain('Node');
      }
    });

    it('should include Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should set proper Cache-Control headers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      // Sensitive data should not be cached
      expect(response.headers['cache-control']).toContain('no-store');
    });
  });

  describe('Error Response Security', () => {
    it('should not leak stack traces in error responses', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-id-that-causes-error')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.stack).toBeUndefined();
      expect(response.body.stackTrace).toBeUndefined();
    });

    it('should provide generic error messages', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      // Should not reveal internal details
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('SQL');
      expect(response.body.message).not.toContain('Prisma');
    });

    it('should use consistent error format', async () => {
      const response = await request(app)
        .get('/api/customers/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('API Documentation Security', () => {
    it('should not expose API documentation in production', async () => {
      const docEndpoints = [
        '/api-docs',
        '/swagger',
        '/docs',
        '/api/docs'
      ];

      for (const endpoint of docEndpoints) {
        const response = await request(app).get(endpoint);
        
        // Should be 404 in production or require auth
        if (process.env.NODE_ENV === 'production') {
          expect([401, 404]).toContain(response.status);
        }
      }
    });

    it('should protect GraphQL introspection in production', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: '{ __schema { types { name } } }'
        });

      if (process.env.NODE_ENV === 'production') {
        expect([400, 404]).toContain(response.status);
      }
    });
  });
});
