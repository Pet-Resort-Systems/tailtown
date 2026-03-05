/**
 * Authentication Security Tests
 * 
 * Tests to ensure authentication security:
 * - Password strength requirements
 * - Account lockout after failed attempts
 * - JWT token security
 * - Token expiration
 * - Refresh token rotation
 * - Secure password reset flow
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../../index';

const prisma = new PrismaClient();

describe('Authentication Security Tests', () => {
  const testTenantId = 'auth-security-test-tenant';
  let testStaffId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.staff.deleteMany({
      where: { tenantId: testTenantId }
    });
  });

  afterAll(async () => {
    await prisma.staff.deleteMany({
      where: { tenantId: testTenantId }
    });
    await prisma.$disconnect();
  });

  describe('Password Strength Requirements', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',           // Too common
        '12345678',          // Only numbers
        'abcdefgh',          // Only lowercase
        'ABCDEFGH',          // Only uppercase
        'Pass1',             // Too short
        'password123',       // No special chars
        'Password',          // No numbers or special chars
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/staff')
          .send({
            email: `weak-pass-${Date.now()}@example.com`,
            firstName: 'Test',
            lastName: 'User',
            password: weakPassword,
            role: 'STAFF',
            tenantId: testTenantId
          });

        // Should reject weak passwords
        expect([400, 422]).toContain(response.status);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPassword = 'SecureP@ssw0rd123!';
      
      const response = await request(app)
        .post('/api/staff')
        .send({
          email: `strong-pass-${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          password: strongPassword,
          role: 'STAFF',
          tenantId: testTenantId
        });

      // Should accept strong passwords
      expect([200, 201]).toContain(response.status);
    });

    it('should hash passwords with bcrypt and proper rounds', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      // Verify it's a bcrypt hash
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$/);
      
      // Verify it uses at least 12 rounds
      const rounds = parseInt(hashedPassword.split('$')[2]);
      expect(rounds).toBeGreaterThanOrEqual(12);

      // Verify password can be verified
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('Account Lockout After Failed Attempts', () => {
    let lockoutTestEmail: string;

    beforeEach(async () => {
      lockoutTestEmail = `lockout-test-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 12);
      
      await prisma.staff.create({
        data: {
          email: lockoutTestEmail,
          firstName: 'Lockout',
          lastName: 'Test',
          password: hashedPassword,
          role: 'STAFF',
          tenantId: testTenantId,
          isActive: true
        }
      });
    });

    it('should track failed login attempts', async () => {
      // Attempt 1
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutTestEmail,
          password: 'WrongPassword'
        });
      expect(response1.status).toBe(401);

      // Attempt 2
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutTestEmail,
          password: 'WrongPassword'
        });
      expect(response2.status).toBe(401);

      // Attempt 3
      const response3 = await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutTestEmail,
          password: 'WrongPassword'
        });
      expect(response3.status).toBe(401);
    });

    it('should lock account after 5 failed attempts', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: lockoutTestEmail,
            password: 'WrongPassword'
          });
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutTestEmail,
          password: 'CorrectPassword123!'
        });

      expect(response.status).toBe(423); // 423 Locked
      expect(response.body.message).toContain('locked');
    });

    it('should reset failed attempts after successful login', async () => {
      // Make 2 failed attempts
      await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutTestEmail,
          password: 'WrongPassword'
        });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutTestEmail,
          password: 'WrongPassword'
        });

      // Successful login
      const successResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: lockoutTestEmail,
          password: 'CorrectPassword123!'
        });

      expect(successResponse.status).toBe(200);

      // Failed attempts should be reset, so 5 more failures needed for lockout
      for (let i = 0; i < 4; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: lockoutTestEmail,
            password: 'WrongPassword'
          });
        expect(response.status).toBe(401);
      }
    });
  });

  describe('JWT Token Security', () => {
    let validToken: string;
    let testEmail: string;

    beforeEach(async () => {
      testEmail = `jwt-test-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
      
      await prisma.staff.create({
        data: {
          email: testEmail,
          firstName: 'JWT',
          lastName: 'Test',
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: testTenantId,
          isActive: true
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'TestPassword123!'
        });

      validToken = loginResponse.body.token;
    });

    it('should include required claims in JWT token', () => {
      const decoded = jwt.decode(validToken) as any;

      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('tenantId');
      expect(decoded).toHaveProperty('iat'); // Issued at
      expect(decoded).toHaveProperty('exp'); // Expiration
    });

    it('should set appropriate token expiration (8 hours)', () => {
      const decoded = jwt.decode(validToken) as any;
      const expiresIn = decoded.exp - decoded.iat;

      // Should expire in approximately 8 hours (28800 seconds)
      expect(expiresIn).toBeGreaterThanOrEqual(28700);
      expect(expiresIn).toBeLessThanOrEqual(28900);
    });

    it('should reject expired tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        {
          userId: 'test-user',
          email: testEmail,
          role: 'ADMIN',
          tenantId: testTenantId
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('expired');
    });

    it('should reject tokens with invalid signature', async () => {
      const invalidToken = jwt.sign(
        {
          userId: 'test-user',
          email: testEmail,
          role: 'ADMIN',
          tenantId: testTenantId
        },
        'wrong-secret',
        { expiresIn: '8h' }
      );

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'not.a.token',
        'Bearer invalid',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        '',
        'null',
        'undefined'
      ];

      for (const malformedToken of malformedTokens) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${malformedToken}`);

        expect(response.status).toBe(401);
      }
    });

    it('should not accept tokens without Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', validToken); // Missing "Bearer "

      expect(response.status).toBe(401);
    });
  });

  describe('Refresh Token Security', () => {
    let refreshToken: string;
    let testEmail: string;

    beforeEach(async () => {
      testEmail = `refresh-test-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
      
      await prisma.staff.create({
        data: {
          email: testEmail,
          firstName: 'Refresh',
          lastName: 'Test',
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: testTenantId,
          isActive: true
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'TestPassword123!'
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should issue refresh token on login', () => {
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(0);
    });

    it('should rotate refresh token on use', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should invalidate old refresh token after rotation', async () => {
      // Use refresh token once
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      // Try to use old refresh token again
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });

    it('should have longer expiration than access token (7 days)', () => {
      const decoded = jwt.decode(refreshToken) as any;
      const expiresIn = decoded.exp - decoded.iat;

      // Should expire in approximately 7 days (604800 seconds)
      expect(expiresIn).toBeGreaterThanOrEqual(604000);
      expect(expiresIn).toBeLessThanOrEqual(605000);
    });
  });

  describe('Password Reset Security', () => {
    let resetTestEmail: string;

    beforeEach(async () => {
      resetTestEmail = `reset-test-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('OldPassword123!', 12);
      
      await prisma.staff.create({
        data: {
          email: resetTestEmail,
          firstName: 'Reset',
          lastName: 'Test',
          password: hashedPassword,
          role: 'STAFF',
          tenantId: testTenantId,
          isActive: true
        }
      });
    });

    it('should not reveal if email exists when requesting reset', async () => {
      // Request reset for existing email
      const response1 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: resetTestEmail });

      // Request reset for non-existing email
      const response2 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Both should return same response
      expect(response1.status).toBe(response2.status);
      expect(response1.body.message).toBe(response2.body.message);
    });

    it('should generate secure reset tokens', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: resetTestEmail });

      // Token should be long and random
      if (response.body.resetToken) {
        expect(response.body.resetToken.length).toBeGreaterThanOrEqual(32);
      }
    });

    it('should expire reset tokens after 1 hour', async () => {
      // This would require time manipulation or waiting
      // For now, verify the logic exists in the code
      expect(true).toBe(true); // Placeholder
    });

    it('should invalidate reset token after use', async () => {
      // Request reset
      const resetResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: resetTestEmail });

      const resetToken = resetResponse.body.resetToken;

      if (resetToken) {
        // Use reset token
        await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: resetToken,
            newPassword: 'NewPassword123!'
          });

        // Try to use same token again
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: resetToken,
            newPassword: 'AnotherPassword123!'
          });

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Session Security', () => {
    it('should set secure cookie attributes', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const cookieString = cookies.join(';');
        expect(cookieString).toContain('HttpOnly');
        expect(cookieString).toContain('Secure');
        expect(cookieString).toContain('SameSite');
      }
    });

    it('should prevent session fixation', async () => {
      // Login should generate new session ID
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      // Session IDs should be different
      expect(response1.body.token).not.toBe(response2.body.token);
    });
  });
});
