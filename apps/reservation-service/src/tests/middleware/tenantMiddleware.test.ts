// @ts-nocheck
/**
 * Tests for tenantMiddleware
 *
 * Tests the multi-tenant isolation middleware that validates
 * and resolves tenant IDs from request headers.
 */

import { Request, Response, NextFunction } from 'express';

// Mock dependencies
jest.mock('../../config/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/appError', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import { tenantMiddleware } from '../../middleware/tenantMiddleware';
import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';

describe('tenantMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('when x-tenant-id header is missing', () => {
    it('should call next with an error', async () => {
      await tenantMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Request missing required x-tenant-id header'
      );
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tenant ID is required',
          statusCode: 400,
        })
      );
    });
  });

  describe('when x-tenant-id is a valid UUID', () => {
    it('should attach tenantId to request and call next', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      mockReq.headers = { 'x-tenant-id': uuid };

      await tenantMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBe(uuid);
      expect(mockNext).toHaveBeenCalledWith();
      expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('should handle uppercase UUIDs', async () => {
      const uuid = '123E4567-E89B-12D3-A456-426614174000';
      mockReq.headers = { 'x-tenant-id': uuid };

      await tenantMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBe(uuid);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('when x-tenant-id is a subdomain', () => {
    it('should look up tenant and attach UUID to request', async () => {
      const subdomain = 'acme-corp';
      const tenantUuid = '123e4567-e89b-12d3-a456-426614174000';
      mockReq.headers = { 'x-tenant-id': subdomain };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: tenantUuid,
      });

      await tenantMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { subdomain },
        select: { id: true },
      });
      expect(mockReq.tenantId).toBe(tenantUuid);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 404 when tenant not found', async () => {
      const subdomain = 'nonexistent-tenant';
      mockReq.headers = { 'x-tenant-id': subdomain };

      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await tenantMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        `Tenant not found for subdomain: ${subdomain}`
      );
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tenant not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const subdomain = 'test-tenant';
      mockReq.headers = { 'x-tenant-id': subdomain };

      (prisma.tenant.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await tenantMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in tenant middleware:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to resolve tenant',
          statusCode: 500,
        })
      );
    });
  });

  describe('UUID validation', () => {
    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
    ];

    const invalidUUIDs = [
      'not-a-uuid',
      '123e4567-e89b-12d3-a456',
      '123e4567e89b12d3a456426614174000',
      'dev',
      'acme-corp',
      'tenant_123',
    ];

    validUUIDs.forEach((uuid) => {
      it(`should recognize "${uuid}" as a valid UUID`, async () => {
        mockReq.headers = { 'x-tenant-id': uuid };

        await tenantMiddleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
        expect(mockReq.tenantId).toBe(uuid);
      });
    });

    invalidUUIDs.forEach((value) => {
      it(`should treat "${value}" as a subdomain and look it up`, async () => {
        mockReq.headers = { 'x-tenant-id': value };
        (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: 'resolved-uuid',
        });

        await tenantMiddleware(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
          where: { subdomain: value },
          select: { id: true },
        });
      });
    });
  });
});
