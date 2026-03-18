/**
 * Loyalty Controller Integration Tests
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
import { PointEarningType, RedemptionType } from '@prisma/client';
import {
  getMember,
  addPoints,
  redeemPoints,
  getMemberStats,
} from '../loyalty.controller';

describe('Loyalty Controller Integration Tests', () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;
  let testCustomerId: string;
  let testMemberIds: string[] = [];

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`loyalty-test-${Date.now()}`);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: testTenantId,
        firstName: 'Loyalty',
        lastName: 'Test',
        email: `loyalty-test-${Date.now()}@example.com`,
        phone: '555-0300',
      },
    });
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Clean up loyalty data
    for (const memberId of testMemberIds) {
      await prisma.pointRedemption
        .deleteMany({ where: { memberId } })
        .catch(() => {});
      await prisma.pointTransaction
        .deleteMany({ where: { memberId } })
        .catch(() => {});
      await prisma.loyaltyMember
        .delete({ where: { id: memberId } })
        .catch(() => {});
    }
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMember', () => {
    it('should return existing member', async () => {
      // Create a member first
      const member = await prisma.loyaltyMember.create({
        data: {
          customerId: testCustomerId,
          currentPoints: 500,
          lifetimePoints: 1000,
          currentTier: 'SILVER',
        },
      });
      testMemberIds.push(member.id);

      const req = {
        params: { customerId: testCustomerId },
      } as unknown as Request;
      const res = createMockResponse();

      await getMember(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            customerId: testCustomerId,
            currentPoints: 500,
          }),
        })
      );
    });

    it('should create new member if not exists', async () => {
      // Create a new customer without a loyalty member
      const newCustomer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: 'New',
          lastName: 'Customer',
          email: `new-loyalty-${Date.now()}@example.com`,
          phone: '555-0301',
        },
      });

      const req = {
        params: { customerId: newCustomer.id },
      } as unknown as Request;
      const res = createMockResponse();

      await getMember(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            customerId: newCustomer.id,
            currentPoints: 0,
          }),
        })
      );

      // Track for cleanup
      const createdMember = (res.json as jest.Mock).mock.calls[0][0].data;
      testMemberIds.push(createdMember.id);
    });
  });

  describe('addPoints', () => {
    let addPointsCustomerId: string;

    beforeAll(async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: 'AddPoints',
          lastName: 'Test',
          email: `addpoints-${Date.now()}@example.com`,
          phone: '555-0302',
        },
      });
      addPointsCustomerId = customer.id;

      // Create member with some points
      const member = await prisma.loyaltyMember.create({
        data: {
          customerId: addPointsCustomerId,
          currentPoints: 100,
          lifetimePoints: 500,
          currentTier: 'BRONZE',
        },
      });
      testMemberIds.push(member.id);
    });

    it('should add points and update balance', async () => {
      const req = {
        params: { customerId: addPointsCustomerId },
        body: {
          points: 50,
          type: 'VISIT',
          description: 'Boarding reservation',
        },
      } as unknown as Request;
      const res = createMockResponse();

      await addPoints(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            transaction: expect.objectContaining({
              points: 50,
            }),
          }),
        })
      );
    });

    it('should reject without required fields', async () => {
      const req = {
        params: { customerId: addPointsCustomerId },
        body: { points: 50 }, // Missing type and description
      } as unknown as Request;
      const res = createMockResponse();

      await addPoints(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('required');
    });
  });

  describe('redeemPoints', () => {
    let redeemCustomerId: string;

    beforeAll(async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: 'Redeem',
          lastName: 'Test',
          email: `redeem-${Date.now()}@example.com`,
          phone: '555-0303',
        },
      });
      redeemCustomerId = customer.id;

      // Create member with enough points to redeem
      const member = await prisma.loyaltyMember.create({
        data: {
          customerId: redeemCustomerId,
          currentPoints: 1000,
          lifetimePoints: 2000,
          currentTier: 'SILVER',
        },
      });
      testMemberIds.push(member.id);
    });

    it('should redeem points successfully', async () => {
      const req = {
        params: { customerId: redeemCustomerId },
        body: {
          pointsToRedeem: 200,
          redemptionType: 'DISCOUNT_FIXED',
          value: 2,
          description: '$2 off next reservation',
        },
      } as unknown as Request;
      const res = createMockResponse();

      await redeemPoints(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            redemption: expect.objectContaining({
              pointsRedeemed: 200,
            }),
          }),
        })
      );
    });

    it('should reject redemption with insufficient points', async () => {
      // Create customer with low points
      const lowPointsCustomer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: 'LowPoints',
          lastName: 'Test',
          email: `lowpoints-${Date.now()}@example.com`,
          phone: '555-0304',
        },
      });

      const member = await prisma.loyaltyMember.create({
        data: {
          customerId: lowPointsCustomer.id,
          currentPoints: 50,
          lifetimePoints: 100,
          currentTier: 'BRONZE',
        },
      });
      testMemberIds.push(member.id);

      const req = {
        params: { customerId: lowPointsCustomer.id },
        body: {
          pointsToRedeem: 500, // More than available
          redemptionType: 'DISCOUNT',
          value: 5,
          description: '$5 off',
        },
      } as unknown as Request;
      const res = createMockResponse();

      await redeemPoints(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('Insufficient');
    });

    it('should return 404 for non-existent member', async () => {
      const req = {
        params: { customerId: '00000000-0000-0000-0000-000000000000' },
        body: {
          pointsToRedeem: 100,
          redemptionType: 'DISCOUNT',
          value: 1,
          description: 'Test',
        },
      } as unknown as Request;
      const res = createMockResponse();

      await redeemPoints(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Member not found');
    });
  });

  describe('getMemberStats', () => {
    let statsCustomerId: string;

    beforeAll(async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testTenantId,
          firstName: 'Stats',
          lastName: 'Test',
          email: `stats-${Date.now()}@example.com`,
          phone: '555-0305',
        },
      });
      statsCustomerId = customer.id;

      // Create member with transactions and redemptions
      const member = await prisma.loyaltyMember.create({
        data: {
          customerId: statsCustomerId,
          currentPoints: 500,
          lifetimePoints: 1500,
          currentTier: 'SILVER',
        },
      });
      testMemberIds.push(member.id);

      // Add some transactions
      await prisma.pointTransaction.createMany({
        data: [
          {
            memberId: member.id,
            points: 100,
            type: PointEarningType.VISIT,
            description: 'Res 1',
          },
          {
            memberId: member.id,
            points: 200,
            type: PointEarningType.VISIT,
            description: 'Res 2',
          },
          {
            memberId: member.id,
            points: 500,
            type: PointEarningType.REFERRAL,
            description: 'Referral',
          },
        ],
      });

      // Add some redemptions
      await prisma.pointRedemption.createMany({
        data: [
          {
            memberId: member.id,
            pointsRedeemed: 100,
            redemptionType: RedemptionType.DISCOUNT_FIXED,
            value: 1,
            description: '$1 off',
          },
          {
            memberId: member.id,
            pointsRedeemed: 200,
            redemptionType: RedemptionType.DISCOUNT_FIXED,
            value: 2,
            description: '$2 off',
          },
        ],
      });
    });

    it('should return member statistics', async () => {
      const req = {
        params: { customerId: statsCustomerId },
      } as unknown as Request;
      const res = createMockResponse();

      await getMemberStats(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            currentPoints: 500,
            lifetimePoints: 1500,
            currentTier: 'SILVER',
            totalEarned: 800, // 100 + 200 + 500
            totalRedeemed: 300, // 100 + 200
          }),
        })
      );
    });

    it('should return 404 for non-existent member', async () => {
      const req = {
        params: { customerId: '00000000-0000-0000-0000-000000000000' },
      } as unknown as Request;
      const res = createMockResponse();

      await getMemberStats(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
