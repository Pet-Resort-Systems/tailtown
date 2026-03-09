/**
 * Authentication Flow Tests
 * 
 * These tests ensure the complete authentication flow works correctly:
 * - Login returns JWT tokens
 * - Tokens contain correct claims
 * - Authenticated requests work
 * - Unauthenticated requests are rejected
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { verifyToken, generateToken } from '../../utils/jwt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Authentication Flow', () => {
  let testStaffId: string;
  const testEmail = 'auth-test@example.com';
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Create test staff member
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const staff = await prisma.staff.create({
      data: {
        email: testEmail,
        firstName: 'Auth',
        lastName: 'Test',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: 'test-tenant',
        isActive: true
      }
    });
    testStaffId = staff.id;
  });

  afterAll(async () => {
    await prisma.staff.deleteMany({
      where: { tenantId: 'test-tenant' }
    });
    await prisma.$disconnect();
  });

  describe('Login Endpoint', () => {
    test('returns JWT token on successful login', async () => {
      const response = await request(app)
        .post('/api/staff/login')
        .set('x-tenant-id', 'test-tenant')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    test('JWT token contains correct claims', async () => {
      const response = await request(app)
        .post('/api/staff/login')
        .set('x-tenant-id', 'test-tenant')
        .send({
          email: testEmail,
          password: testPassword
        });

      const token = response.body.accessToken;
      const decoded = verifyToken(token);

      expect(decoded).toMatchObject({
        id: testStaffId,
        email: testEmail,
        role: 'ADMIN',
        tenantId: 'test-tenant'
      });
    });

    test('rejects invalid credentials', async () => {
      const response = await request(app)
        .post('/api/staff/login')
        .set('x-tenant-id', 'test-tenant')
        .send({
          email: testEmail,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).not.toHaveProperty('accessToken');
    });

    test('rejects login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/staff/login')
        .set('x-tenant-id', 'test-tenant')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Authenticated Requests', () => {
    let validToken: string;

    beforeAll(() => {
      validToken = generateToken({
        id: testStaffId,
        email: testEmail,
        role: 'ADMIN',
        tenantId: 'test-tenant'
      });
    });

    test('accepts requests with valid token', async () => {
      const response = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'test-tenant');

      expect(response.status).toBe(200);
    });

    test('rejects requests without token', async () => {
      const response = await request(app)
        .get('/api/staff')
        .set('x-tenant-id', 'test-tenant');

      expect(response.status).toBe(401);
    });

    test('rejects requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/staff')
        .set('Authorization', 'Bearer invalid-token-here')
        .set('x-tenant-id', 'test-tenant');

      expect(response.status).toBe(401);
    });

    test('rejects requests with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/staff')
        .set('Authorization', validToken) // Missing "Bearer " prefix
        .set('x-tenant-id', 'test-tenant');

      expect(response.status).toBe(401);
    });
  });

  describe('Token Validation', () => {
    test('validates token signature', () => {
      const validToken = generateToken({
        id: 'test-id',
        email: 'test@example.com',
        role: 'ADMIN',
        tenantId: 'test'
      });

      expect(() => verifyToken(validToken)).not.toThrow();
    });

    test('rejects tampered tokens', () => {
      const validToken = generateToken({
        id: 'test-id',
        email: 'test@example.com',
        role: 'ADMIN',
        tenantId: 'test'
      });

      // Tamper with the token
      const tamperedToken = validToken.slice(0, -10) + 'tampered123';

      expect(() => verifyToken(tamperedToken)).toThrow();
    });
  });

  describe('User Context', () => {
    test('authenticated request has correct user context', async () => {
      const token = generateToken({
        id: testStaffId,
        email: testEmail,
        role: 'ADMIN',
        tenantId: 'test-tenant'
      });

      const response = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'test-tenant');

      expect(response.status).toBe(200);
      // The request should have been processed with the correct tenant context
      // Verify by checking that only test-tenant staff are returned
      const allStaff = response.body.data;
      const hasCorrectTenant = allStaff.every(
        (s: any) => s.tenantId === 'test-tenant'
      );
      expect(hasCorrectTenant).toBe(true);
    });
  });
});
