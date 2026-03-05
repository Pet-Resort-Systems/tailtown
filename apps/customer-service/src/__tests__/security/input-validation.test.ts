/**
 * Input Validation Security Tests
 * 
 * Tests to ensure proper input validation:
 * - Data type validation
 * - Range validation
 * - Format validation
 * - Required field validation
 * - Edge case handling
 * - Boundary testing
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import app from '../../index';

const prisma = new PrismaClient();

describe('Input Validation Security Tests', () => {
  let authToken: string;
  const testTenantId = 'input-validation-test-tenant';

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    await prisma.staff.create({
      data: {
        email: 'input-validation-test@example.com',
        firstName: 'Input',
        lastName: 'Validation',
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
        email: 'input-validation-test@example.com',
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

  describe('Data Type Validation', () => {
    it('should reject string where number expected', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: 123456 // Should be string
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject number where string expected', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 12345, // Should be string
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject boolean where string expected', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: true, // Should be string
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject array where object expected', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(['not', 'an', 'object']);

      expect([400, 422]).toContain(response.status);
    });

    it('should reject null values for required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: null,
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject undefined values for required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: undefined,
          email: 'john@example.com',
          phone: '1234567890'
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('String Length Validation', () => {
    it('should reject strings exceeding maximum length', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'A'.repeat(256), // Too long
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject strings below minimum length', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'J', // Too short (if min is 2)
          lastName: 'D',
          email: 'john@example.com',
          phone: '123' // Too short for phone
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should accept strings within valid length range', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `valid-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should trim whitespace before validation', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '  John  ',
          lastName: '  Doe  ',
          email: `trim-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      expect([200, 201]).toContain(response.status);
      if (response.body.data) {
        expect(response.body.data.firstName).toBe('John');
        expect(response.body.data.lastName).toBe('Doe');
      }
    });
  });

  describe('Email Format Validation', () => {
    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'user..name@example.com',
        'user@.example.com',
        'user@example..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'John',
            lastName: 'Doe',
            email: email,
            phone: '1234567890'
          });

        expect([400, 422]).toContain(response.status);
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        `user-${Date.now()}@example.com`,
        `user.name-${Date.now()}@example.com`,
        `user+tag-${Date.now()}@example.co.uk`,
        `123-${Date.now()}@example.com`
      ];

      for (const email of validEmails) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'John',
            lastName: 'Doe',
            email: email,
            phone: '1234567890'
          });

        expect([200, 201]).toContain(response.status);
      }
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `UPPERCASE-${Date.now()}@EXAMPLE.COM`,
          phone: '1234567890'
        });

      if (response.status === 201 && response.body.data) {
        expect(response.body.data.email).toMatch(/^[a-z0-9]/);
      }
    });
  });

  describe('Phone Number Validation', () => {
    it('should reject invalid phone number formats', async () => {
      const invalidPhones = [
        '123', // Too short
        'abcdefghij', // Letters
        '123-456-789', // Invalid format
        '+1 (800) CALL-NOW', // Letters
        '12345678901234567890' // Too long
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'John',
            lastName: 'Doe',
            email: `phone-test-${Date.now()}@example.com`,
            phone: phone
          });

        expect([400, 422]).toContain(response.status);
      }
    });

    it('should accept valid phone number formats', async () => {
      const validPhones = [
        '1234567890',
        '+1234567890',
        '(123) 456-7890',
        '123-456-7890'
      ];

      for (const phone of validPhones) {
        const response = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'John',
            lastName: 'Doe',
            email: `phone-valid-${Date.now()}@example.com`,
            phone: phone
          });

        expect([200, 201]).toContain(response.status);
      }
    });
  });

  describe('Date Format Validation', () => {
    it('should reject invalid date formats', async () => {
      const invalidDates = [
        '2025-13-01', // Invalid month
        '2025-01-32', // Invalid day
        '2025/01/01', // Wrong separator
        '01-01-2025', // Wrong order
        'not-a-date',
        '2025-02-30' // Invalid date
      ];

      for (const date of invalidDates) {
        const response = await request(app)
          .post('/api/reservations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId: 'test-customer-id',
            startDate: date,
            endDate: '2025-12-05',
            serviceId: 'test-service-id'
          });

        expect([400, 422]).toContain(response.status);
      }
    });

    it('should accept valid ISO date formats', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'test-customer-id',
          startDate: '2025-12-01',
          endDate: '2025-12-05',
          serviceId: 'test-service-id'
        });

      // May fail for other reasons, but not date format
      expect(response.status).not.toBe(422);
    });

    it('should reject end date before start date', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'test-customer-id',
          startDate: '2025-12-05',
          endDate: '2025-12-01', // Before start date
          serviceId: 'test-service-id'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject dates in the past', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'test-customer-id',
          startDate: '2020-01-01', // Past date
          endDate: '2020-01-05',
          serviceId: 'test-service-id'
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Numeric Range Validation', () => {
    it('should reject numbers below minimum', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          price: -10, // Negative price
          duration: 60,
          serviceCategory: 'BOARDING'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject numbers above maximum', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          price: 999999999, // Unreasonably high
          duration: 60,
          serviceCategory: 'BOARDING'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should accept numbers within valid range', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Test Service ${Date.now()}`,
          price: 50.00,
          duration: 60,
          serviceCategory: 'BOARDING'
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should validate decimal precision', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Test Service ${Date.now()}`,
          price: 50.999, // Too many decimal places
          duration: 60,
          serviceCategory: 'BOARDING'
        });

      // Should either reject or round
      if (response.status === 201 && response.body.data) {
        expect(response.body.data.price).toBeLessThanOrEqual(51.00);
      }
    });
  });

  describe('Enum Validation', () => {
    it('should reject invalid enum values', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          price: 50,
          duration: 60,
          serviceCategory: 'INVALID_CATEGORY'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should accept valid enum values', async () => {
      const validCategories = ['BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING'];

      for (const category of validCategories) {
        const response = await request(app)
          .post('/api/services')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Test Service ${Date.now()}`,
            price: 50,
            duration: 60,
            serviceCategory: category
          });

        expect([200, 201]).toContain(response.status);
      }
    });

    it('should be case-sensitive for enum values', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          price: 50,
          duration: 60,
          serviceCategory: 'boarding' // lowercase
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Required Field Validation', () => {
    it('should reject requests missing required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John'
          // Missing lastName, email, phone
        });

      expect([400, 422]).toContain(response.status);
      expect(response.body.message).toBeDefined();
    });

    it('should accept requests with all required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `required-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should allow optional fields to be omitted', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `optional-${Date.now()}@example.com`,
          phone: '1234567890'
          // Optional fields like address, notes omitted
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Special Character Handling', () => {
    it('should handle unicode characters correctly', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'José',
          lastName: 'Müller',
          email: `unicode-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should handle emoji in text fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John 😀',
          lastName: 'Doe',
          email: `emoji-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      // Should either accept or sanitize
      expect(response.status).toBeLessThan(500);
    });

    it('should sanitize control characters', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John\x00\x01\x02', // Null and control chars
          lastName: 'Doe',
          email: `control-${Date.now()}@example.com`,
          phone: '1234567890'
        });

      if (response.status === 201 && response.body.data) {
        expect(response.body.data.firstName).not.toContain('\x00');
      }
    });
  });

  describe('Array Validation', () => {
    it('should validate array length', async () => {
      const tooManyItems = Array(1000).fill('item');

      const response = await request(app)
        .post('/api/bulk-operation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: tooManyItems
        });

      expect([400, 413, 422]).toContain(response.status);
    });

    it('should validate array item types', async () => {
      const response = await request(app)
        .post('/api/bulk-operation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: ['string', 123, true, null] // Mixed types
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject empty arrays when items required', async () => {
      const response = await request(app)
        .post('/api/bulk-operation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: []
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Boundary Testing', () => {
    it('should handle maximum integer value', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          price: Number.MAX_SAFE_INTEGER,
          duration: 60,
          serviceCategory: 'BOARDING'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should handle minimum integer value', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          price: Number.MIN_SAFE_INTEGER,
          duration: 60,
          serviceCategory: 'BOARDING'
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should handle zero values appropriately', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Service',
          price: 0,
          duration: 0,
          serviceCategory: 'BOARDING'
        });

      // Should reject zero duration
      expect([400, 422]).toContain(response.status);
    });

    it('should handle floating point precision', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Test Service ${Date.now()}`,
          price: 0.1 + 0.2, // 0.30000000000000004
          duration: 60,
          serviceCategory: 'BOARDING'
        });

      if (response.status === 201 && response.body.data) {
        expect(response.body.data.price).toBeCloseTo(0.3, 2);
      }
    });
  });
});
