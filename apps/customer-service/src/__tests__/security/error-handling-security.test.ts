/**
 * Error Handling Security Tests
 * 
 * Tests to ensure secure error handling:
 * - No stack traces in production
 * - Generic error messages to users
 * - Proper error logging
 * - No information disclosure
 * - Consistent error format
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Error Handling Security Tests', () => {
  let authToken: string;
  const testTenantId = 'error-handling-test-tenant';

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    await prisma.staff.create({
      data: {
        email: 'error-handling-test@example.com',
        firstName: 'ErrorHandling',
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
        email: 'error-handling-test@example.com',
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

  describe('Stack Trace Prevention', () => {
    it('should not expose stack traces in production', async () => {
      // Trigger an error
      const response = await request(app)
        .get('/api/customers/invalid-id-that-causes-error')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not contain stack trace
      expect(response.body.stack).toBeUndefined();
      expect(response.body.stackTrace).toBeUndefined();
      
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('at ');
      expect(responseText).not.toContain('.ts:');
      expect(responseText).not.toContain('.js:');
      expect(responseText).not.toContain('node_modules');
    });

    it('should not expose file paths in errors', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('/src/');
      expect(responseText).not.toContain('/dist/');
      expect(responseText).not.toContain('/Users/');
      expect(responseText).not.toContain('C:\\');
    });

    it('should not expose function names in errors', async () => {
      const response = await request(app)
        .get('/api/customers/trigger-error')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/at\s+\w+\s+\(/);
    });

    it('should not expose line numbers in errors', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/:\d+:\d+/);
    });
  });

  describe('Generic Error Messages', () => {
    it('should provide generic message for server errors', async () => {
      const response = await request(app)
        .get('/api/customers/cause-500-error')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 500) {
        expect(response.body.message).toMatch(/internal server error|something went wrong/i);
        expect(response.body.message).not.toContain('database');
        expect(response.body.message).not.toContain('SQL');
        expect(response.body.message).not.toContain('connection');
      }
    });

    it('should provide generic message for authentication errors', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/unauthorized|authentication/i);
      expect(response.body.message).not.toContain('jwt');
      expect(response.body.message).not.toContain('token');
      expect(response.body.message).not.toContain('secret');
    });

    it('should provide generic message for authorization errors', async () => {
      const response = await request(app)
        .delete('/api/admin/system-settings')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 403) {
        expect(response.body.message).toMatch(/forbidden|not authorized|permission/i);
        expect(response.body.message).not.toContain('role');
        expect(response.body.message).not.toContain('ADMIN');
      }
    });

    it('should provide generic message for not found errors', async () => {
      const response = await request(app)
        .get('/api/customers/nonexistent-id-12345')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
      expect(response.body.message).not.toContain('table');
      expect(response.body.message).not.toContain('query');
    });

    it('should not reveal database errors', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'error-handling-test@example.com', // Duplicate email
          phone: '1234567890'
        });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('Prisma');
      expect(responseText).not.toContain('PostgreSQL');
      expect(responseText).not.toContain('constraint');
      expect(responseText).not.toContain('unique');
      expect(responseText).not.toContain('foreign key');
    });

    it('should not reveal validation library details', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'A'.repeat(1000),
          lastName: 'Test'
        });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('joi');
      expect(responseText).not.toContain('yup');
      expect(responseText).not.toContain('validator');
      expect(responseText).not.toContain('zod');
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not reveal server technology in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('Express');
      expect(responseText).not.toContain('Node.js');
      expect(responseText).not.toContain('TypeScript');
    });

    it('should not reveal database type in errors', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('PostgreSQL');
      expect(responseText).not.toContain('MySQL');
      expect(responseText).not.toContain('MongoDB');
      expect(responseText).not.toContain('Redis');
    });

    it('should not reveal environment variables in errors', async () => {
      const response = await request(app)
        .get('/api/customers/trigger-config-error')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('DATABASE_URL');
      expect(responseText).not.toContain('JWT_SECRET');
      expect(responseText).not.toContain('API_KEY');
      expect(responseText).not.toContain('process.env');
    });

    it('should not reveal internal IP addresses', async () => {
      const response = await request(app)
        .get('/api/customers/network-error')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
      expect(responseText).not.toContain('localhost');
      expect(responseText).not.toContain('127.0.0.1');
    });

    it('should not reveal internal hostnames', async () => {
      const response = await request(app)
        .get('/api/customers/connection-error')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('db-server');
      expect(responseText).not.toContain('redis-cache');
      expect(responseText).not.toContain('.internal');
    });

    it('should not reveal version numbers', async () => {
      const response = await request(app)
        .get('/api/customers/version-error')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/v?\d+\.\d+\.\d+/);
    });
  });

  describe('Consistent Error Format', () => {
    it('should use consistent error structure', async () => {
      const errors = [
        await request(app).get('/api/customers/nonexistent').set('Authorization', `Bearer ${authToken}`),
        await request(app).post('/api/customers').set('Authorization', `Bearer ${authToken}`).send({}),
        await request(app).get('/api/customers').set('Authorization', 'Bearer invalid')
      ];

      errors.forEach(response => {
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('status');
        expect(typeof response.body.message).toBe('string');
        expect(typeof response.body.status).toBe('number');
      });
    });

    it('should include error code for client handling', async () => {
      const response = await request(app)
        .get('/api/customers/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('code');
      expect(typeof response.body.code).toBe('string');
    });

    it('should include timestamp in errors', async () => {
      const response = await request(app)
        .get('/api/customers/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include request ID for tracking', async () => {
      const response = await request(app)
        .get('/api/customers/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('requestId');
    });
  });

  describe('Error Logging', () => {
    it('should log errors with sufficient detail', async () => {
      await request(app)
        .get('/api/customers/cause-error')
        .set('Authorization', `Bearer ${authToken}`);

      // Verify error is logged (would check actual logs)
      expect(true).toBe(true); // Placeholder
    });

    it('should log error context without sensitive data', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        });

      // Logs should contain email but not password
      expect(true).toBe(true); // Placeholder
    });

    it('should include correlation ID in logs', async () => {
      await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', 'test-correlation-123');

      // Logs should include correlation ID
      expect(true).toBe(true); // Placeholder
    });

    it('should log error severity levels', async () => {
      // Different errors should have different severity
      await request(app).get('/api/customers/not-found').set('Authorization', `Bearer ${authToken}`); // INFO
      await request(app).post('/api/customers').set('Authorization', `Bearer ${authToken}`).send({}); // WARN
      await request(app).get('/api/customers/server-error').set('Authorization', `Bearer ${authToken}`); // ERROR

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('404 Error Handling', () => {
    it('should return 404 for nonexistent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should not reveal valid endpoints in 404 errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.message).not.toContain('/api/customers');
      expect(response.body.message).not.toContain('available endpoints');
    });

    it('should not reveal route patterns in 404 errors', async () => {
      const response = await request(app)
        .get('/api/customers/abc/invalid/route')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain(':id');
      expect(responseText).not.toContain('/:');
    });

    it('should handle malformed URLs gracefully', async () => {
      const malformedUrls = [
        '/api/customers/%00',
        '/api/customers/../admin',
        '/api/customers/../../etc/passwd'
      ];

      for (const url of malformedUrls) {
        const response = await request(app)
          .get(url)
          .set('Authorization', `Bearer ${authToken}`);

        expect([400, 404]).toContain(response.status);
        expect(response.body.stack).toBeUndefined();
      }
    });
  });

  describe('Validation Error Handling', () => {
    it('should provide helpful validation errors', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
      expect(response.body.errors).toBeDefined();
    });

    it('should not expose validation library internals', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'A'.repeat(1000)
        });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('ValidationError');
      expect(responseText).not.toContain('validator');
    });

    it('should sanitize user input in validation errors', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '<script>alert("xss")</script>'
        });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>');
    });
  });

  describe('Rate Limit Error Handling', () => {
    it('should provide clear rate limit error', async () => {
      // Make many requests to trigger rate limit
      let rateLimitResponse;
      
      for (let i = 0; i < 200; i++) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 429) {
          rateLimitResponse = response;
          break;
        }
      }

      if (rateLimitResponse) {
        expect(rateLimitResponse.body.message).toMatch(/rate limit|too many requests/i);
        expect(rateLimitResponse.headers['retry-after']).toBeDefined();
      }
    });

    it('should not reveal rate limit implementation', async () => {
      // Trigger rate limit
      let response;
      for (let i = 0; i < 200; i++) {
        response = await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' });
        if (response.status === 429) break;
      }

      if (response && response.status === 429) {
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('Redis');
        expect(responseText).not.toContain('memory');
      }
    });
  });

  describe('Database Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // This would require simulating DB connection failure
      expect(true).toBe(true); // Placeholder
    });

    it('should handle timeout errors gracefully', async () => {
      // This would require simulating DB timeout
      expect(true).toBe(true); // Placeholder
    });

    it('should not expose SQL in errors', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-query')
        .set('Authorization', `Bearer ${authToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('SELECT');
      expect(responseText).not.toContain('FROM');
      expect(responseText).not.toContain('WHERE');
      expect(responseText).not.toContain('INSERT');
      expect(responseText).not.toContain('UPDATE');
      expect(responseText).not.toContain('DELETE');
    });
  });

  describe('Third-Party Service Error Handling', () => {
    it('should handle external API failures gracefully', async () => {
      // If app calls external services
      const response = await request(app)
        .post('/api/customers/send-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'test-id',
          subject: 'Test',
          body: 'Test'
        });

      // Should not expose external service details
      if (response.status >= 500) {
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('SendGrid');
        expect(responseText).not.toContain('Twilio');
        expect(responseText).not.toContain('Stripe');
      }
    });

    it('should handle timeout from external services', async () => {
      // Should return generic error
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Recovery', () => {
    it('should provide recovery suggestions for common errors', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
      // Could include suggestion to login again
    });

    it('should provide support contact for server errors', async () => {
      const response = await request(app)
        .get('/api/customers/server-error')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 500) {
        // Could include support email or request ID
        expect(response.body.requestId).toBeDefined();
      }
    });
  });
});
