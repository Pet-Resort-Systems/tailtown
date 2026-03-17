/**
 * Coupon Controller Integration Tests
 *
 * Tests that actually call controller functions against the test database.
 */

import { Request, Response, NextFunction } from 'express';
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from '../../test/setup-test-db';
import {
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  validateCoupon,
} from '../coupon.controller';

describe('Coupon Controller Integration Tests', () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCouponIds: string[] = [];
  let testCustomerId: string;

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`coupon-test-${Date.now()}`);

    // Create test customer for validation tests
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: 'Coupon',
        lastName: 'Test',
        email: `coupon-test-${Date.now()}@example.com`,
        phone: '555-0500',
      },
    });
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Clean up coupons
    for (const couponId of testCouponIds) {
      await prisma.couponUsage
        .deleteMany({ where: { couponId } })
        .catch(() => {});
      await prisma.coupon.delete({ where: { id: couponId } }).catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCoupons', () => {
    beforeAll(async () => {
      // Create test coupons
      const coupon1 = await prisma.coupon.create({
        data: {
          code: `TEST10-${Date.now()}`,
          description: 'Test 10% off',
          type: 'PERCENTAGE',
          discountValue: 10,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      testCouponIds.push(coupon1.id);

      const coupon2 = await prisma.coupon.create({
        data: {
          code: `TEST20-${Date.now()}`,
          description: 'Test $20 off',
          type: 'FIXED_AMOUNT',
          discountValue: 20,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      testCouponIds.push(coupon2.id);
    });

    it('should return paginated coupons', async () => {
      const req = {
        query: { page: '1', limit: '10' },
      } as unknown as Request;
      const res = createMockResponse();

      await getAllCoupons(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          results: expect.any(Number),
          data: expect.any(Array),
        })
      );
    });

    it('should filter by status', async () => {
      const req = {
        query: { status: 'ACTIVE' },
      } as unknown as Request;
      const res = createMockResponse();

      await getAllCoupons(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      responseData.data.forEach((coupon: any) => {
        expect(coupon.status).toBe('ACTIVE');
      });
    });

    it('should search by code', async () => {
      const req = {
        query: { search: 'TEST' },
      } as unknown as Request;
      const res = createMockResponse();

      await getAllCoupons(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getCouponById', () => {
    let testCouponId: string;

    beforeAll(async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `BYID-${Date.now()}`,
          description: 'Test coupon by ID',
          type: 'PERCENTAGE',
          discountValue: 15,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      testCouponId = coupon.id;
      testCouponIds.push(testCouponId);
    });

    it('should return coupon by ID', async () => {
      const req = {
        params: { id: testCouponId },
      } as unknown as Request;
      const res = createMockResponse();

      await getCouponById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            id: testCouponId,
            discountValue: 15,
          }),
        })
      );
    });

    it('should return 404 for non-existent coupon', async () => {
      const req = {
        params: { id: '00000000-0000-0000-0000-000000000000' },
      } as unknown as Request;
      const res = createMockResponse();

      await getCouponById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Coupon not found');
    });
  });

  describe('getCouponByCode', () => {
    let testCouponCode: string;

    beforeAll(async () => {
      testCouponCode = `BYCODE-${Date.now()}`;
      const coupon = await prisma.coupon.create({
        data: {
          code: testCouponCode,
          description: 'Test coupon by code',
          type: 'PERCENTAGE',
          discountValue: 25,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      testCouponIds.push(coupon.id);
    });

    it('should find coupon by code (case-insensitive)', async () => {
      const req = {
        params: { code: testCouponCode.toLowerCase() },
      } as unknown as Request;
      const res = createMockResponse();

      await getCouponByCode(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            discountValue: 25,
          }),
        })
      );
    });

    it('should return 404 for non-existent code', async () => {
      const req = {
        params: { code: 'NONEXISTENT' },
      } as unknown as Request;
      const res = createMockResponse();

      await getCouponByCode(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createCoupon', () => {
    it('should create coupon with all fields', async () => {
      const req = {
        body: {
          code: `NEW-${Date.now()}`,
          description: 'New test coupon',
          type: 'PERCENTAGE',
          discountValue: 30,
          validFrom: new Date().toISOString(),
          validUntil: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      } as unknown as Request;
      const res = createMockResponse();

      await createCoupon(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            discountValue: 30,
            status: 'ACTIVE',
          }),
        })
      );

      // Track for cleanup
      const createdCoupon = (res.json as jest.Mock).mock.calls[0][0].data;
      testCouponIds.push(createdCoupon.id);
    });

    it('should reject coupon without required fields', async () => {
      const req = {
        body: { code: 'INCOMPLETE' },
      } as unknown as Request;
      const res = createMockResponse();

      await createCoupon(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('updateCoupon', () => {
    let updateCouponId: string;

    beforeAll(async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `UPDATE-${Date.now()}`,
          description: 'Coupon to update',
          type: 'PERCENTAGE',
          discountValue: 10,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      updateCouponId = coupon.id;
      testCouponIds.push(updateCouponId);
    });

    it('should update coupon status', async () => {
      const req = {
        params: { id: updateCouponId },
        body: { status: 'INACTIVE' },
      } as unknown as Request;
      const res = createMockResponse();

      await updateCoupon(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            status: 'INACTIVE',
          }),
        })
      );
    });

    it('should return 404 for non-existent coupon', async () => {
      const req = {
        params: { id: '00000000-0000-0000-0000-000000000000' },
        body: { status: 'INACTIVE' },
      } as unknown as Request;
      const res = createMockResponse();

      await updateCoupon(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateCoupon', () => {
    let validCouponCode: string;
    let expiredCouponCode: string;

    beforeAll(async () => {
      // Create valid coupon
      validCouponCode = `VALID-${Date.now()}`;
      const validCoupon = await prisma.coupon.create({
        data: {
          code: validCouponCode,
          description: 'Valid coupon',
          type: 'PERCENTAGE',
          discountValue: 20,
          status: 'ACTIVE',
          validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      testCouponIds.push(validCoupon.id);

      // Create expired coupon
      expiredCouponCode = `EXPIRED-${Date.now()}`;
      const expiredCoupon = await prisma.coupon.create({
        data: {
          code: expiredCouponCode,
          description: 'Expired coupon',
          type: 'PERCENTAGE',
          discountValue: 50,
          status: 'ACTIVE',
          validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        },
      });
      testCouponIds.push(expiredCoupon.id);
    });

    it('should validate active coupon within date range', async () => {
      const req = {
        body: {
          code: validCouponCode,
          customerId: testCustomerId,
          subtotal: 100,
        },
      } as unknown as Request;
      const res = createMockResponse();

      await validateCoupon(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            isValid: true,
          }),
        })
      );
    });

    it('should reject expired coupon', async () => {
      const req = {
        body: {
          code: expiredCouponCode,
          customerId: testCustomerId,
          subtotal: 100,
        },
      } as unknown as Request;
      const res = createMockResponse();

      await validateCoupon(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isValid: false,
          }),
        })
      );
    });

    it('should return invalid for non-existent coupon', async () => {
      const req = {
        body: {
          code: 'NONEXISTENT',
          customerId: testCustomerId,
          subtotal: 100,
        },
      } as unknown as Request;
      const res = createMockResponse();

      await validateCoupon(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isValid: false,
          }),
        })
      );
    });
  });
});
