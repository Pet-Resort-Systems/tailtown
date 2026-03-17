/**
 * Business Settings Controller Integration Tests
 */

import { Request, Response, NextFunction } from 'express';
import {
  getTestPrismaClient,
  createTestTenant,
  deleteTestData,
  disconnectTestDatabase,
} from '../../test/setup-test-db';
import { getBusinessSettings } from '../business-settings.controller';

describe('Business Settings Controller Integration Tests', () => {
  const prisma = getTestPrismaClient();
  let testTenantId: string;

  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeAll(async () => {
    testTenantId = await createTestTenant(`business-test-${Date.now()}`);

    // Update tenant with business info
    await prisma.tenant.update({
      where: { id: testTenantId },
      data: {
        businessName: 'Test Business',
        logoUrl: 'https://example.com/logo.png',
      },
    });
  });

  afterAll(async () => {
    await deleteTestData(testTenantId);
    await disconnectTestDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBusinessSettings', () => {
    it('should return business settings for tenant', async () => {
      const req = {
        tenantId: testTenantId,
        query: {},
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getBusinessSettings(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should return 404 for tenant without settings', async () => {
      const req = {
        tenantId: 'nonexistent-tenant',
        query: {},
        params: {},
        body: {},
      } as unknown as Request;
      const res = createMockResponse();

      await getBusinessSettings(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
