// @ts-nocheck
/**
 * Tests for service.ts
 *
 * Tests the service utilities including createService, tenantMiddleware,
 * and the local AppError class.
 */

import { Request, Response, NextFunction } from 'express';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

import { AppError, tenantMiddleware } from '../../utils/service';
import { prisma } from '../../config/prisma';

describe('service.ts utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError class', () => {
    describe('constructor', () => {
      it('should create error with default values', () => {
        const error = new AppError('Test error');

        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.type).toBe('SERVER_ERROR');
        expect(error.isOperational).toBe(true);
      });

      it('should create error with custom status code', () => {
        const error = new AppError('Bad request', 400);

        expect(error.statusCode).toBe(400);
        expect(error.type).toBe('VALIDATION_ERROR');
      });

      it('should map status codes to error types correctly', () => {
        expect(new AppError('', 400).type).toBe('VALIDATION_ERROR');
        expect(new AppError('', 401).type).toBe('UNAUTHORIZED_ERROR');
        expect(new AppError('', 403).type).toBe('FORBIDDEN_ERROR');
        expect(new AppError('', 404).type).toBe('NOT_FOUND_ERROR');
        expect(new AppError('', 409).type).toBe('CONFLICT_ERROR');
        expect(new AppError('', 422).type).toBe('UNPROCESSABLE_ENTITY');
        expect(new AppError('', 500).type).toBe('SERVER_ERROR');
        expect(new AppError('', 503).type).toBe('SERVER_ERROR');
      });

      it('should include details when provided', () => {
        const details = { field: 'email', reason: 'invalid' };
        const error = new AppError('Validation failed', 400, details);

        expect(error.details).toEqual(details);
      });

      it('should be an instance of Error', () => {
        const error = new AppError('Test');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('AppError');
      });

      it('should have a stack trace', () => {
        const error = new AppError('Test');

        expect(error.stack).toBeDefined();
      });
    });

    describe('validationError', () => {
      it('should create a 400 validation error', () => {
        const error = AppError.validationError('Invalid input');

        expect(error.statusCode).toBe(400);
        expect(error.type).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Invalid input');
      });

      it('should include details', () => {
        const error = AppError.validationError('Invalid', { field: 'email' });

        expect(error.details).toEqual({ field: 'email' });
      });
    });

    describe('authorizationError', () => {
      it('should create a 401 authorization error', () => {
        const error = AppError.authorizationError('Not authenticated');

        expect(error.statusCode).toBe(401);
        expect(error.type).toBe('UNAUTHORIZED_ERROR');
      });
    });

    describe('forbiddenError', () => {
      it('should create a 403 forbidden error', () => {
        const error = AppError.forbiddenError('Access denied');

        expect(error.statusCode).toBe(403);
        expect(error.type).toBe('FORBIDDEN_ERROR');
      });
    });

    describe('notFoundError', () => {
      it('should create a 404 not found error without ID', () => {
        const error = AppError.notFoundError('User');

        expect(error.statusCode).toBe(404);
        expect(error.type).toBe('NOT_FOUND_ERROR');
        expect(error.message).toBe('User not found');
      });

      it('should create a 404 not found error with ID', () => {
        const error = AppError.notFoundError('Reservation', 'abc123');

        expect(error.message).toBe('Reservation with ID abc123 not found');
      });

      it('should handle numeric ID', () => {
        const error = AppError.notFoundError('Invoice', 42);

        expect(error.message).toBe('Invoice with ID 42 not found');
      });
    });

    describe('conflictError', () => {
      it('should create a 409 conflict error', () => {
        const error = AppError.conflictError('Resource already exists');

        expect(error.statusCode).toBe(409);
        expect(error.type).toBe('CONFLICT_ERROR');
      });
    });

    describe('databaseError', () => {
      it('should create a 500 database error', () => {
        const error = AppError.databaseError('Connection failed');

        expect(error.statusCode).toBe(500);
        expect(error.type).toBe('SERVER_ERROR');
        expect(error.isOperational).toBe(true);
      });

      it('should allow non-operational database errors', () => {
        const error = AppError.databaseError('Critical failure', null, false);

        expect(error.isOperational).toBe(false);
      });
    });

    describe('serverError', () => {
      it('should create a 500 server error', () => {
        const error = AppError.serverError('Something went wrong');

        expect(error.statusCode).toBe(500);
        expect(error.type).toBe('SERVER_ERROR');
      });
    });
  });

  describe('tenantMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    describe('when tenant ID is required', () => {
      it('should return 401 when tenant ID is missing', async () => {
        const middleware = tenantMiddleware({ required: true });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              type: 'UNAUTHORIZED_ERROR',
            }),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should pass through when UUID tenant ID is provided', async () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        mockReq.headers = { 'x-tenant-id': uuid };

        const middleware = tenantMiddleware({ required: true });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect((mockReq as any).tenantId).toBe(uuid);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when tenant ID is not required', () => {
      it('should pass through without tenant ID', async () => {
        const middleware = tenantMiddleware({ required: false });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('subdomain to UUID conversion', () => {
      it('should convert subdomain to UUID', async () => {
        const subdomain = 'acme-corp';
        const tenantUuid = '123e4567-e89b-12d3-a456-426614174000';
        mockReq.headers = { 'x-tenant-id': subdomain };

        (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: tenantUuid,
        });

        const middleware = tenantMiddleware({ required: true });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
          where: { subdomain },
          select: { id: true },
        });
        expect((mockReq as any).tenantId).toBe(tenantUuid);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should return 404 when subdomain not found', async () => {
        mockReq.headers = { 'x-tenant-id': 'nonexistent' };

        (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

        const middleware = tenantMiddleware({ required: true });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              type: 'NOT_FOUND_ERROR',
            }),
          })
        );
      });
    });

    describe('tenant validation', () => {
      it('should call validateTenant when provided', async () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        mockReq.headers = { 'x-tenant-id': uuid };

        const validateTenant = jest.fn().mockResolvedValue(true);
        const middleware = tenantMiddleware({
          required: true,
          validateTenant,
        });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(validateTenant).toHaveBeenCalledWith(uuid);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should return 403 when validation fails', async () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        mockReq.headers = { 'x-tenant-id': uuid };

        const validateTenant = jest.fn().mockResolvedValue(false);
        const middleware = tenantMiddleware({
          required: true,
          validateTenant,
        });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              type: 'FORBIDDEN_ERROR',
            }),
          })
        );
      });
    });

    describe('error handling', () => {
      it('should call next with error on exception', async () => {
        mockReq.headers = { 'x-tenant-id': 'test-subdomain' };

        const error = new Error('Database error');
        (prisma.tenant.findUnique as jest.Mock).mockRejectedValue(error);

        const middleware = tenantMiddleware({ required: true });

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
      });
    });

    describe('UUID detection', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-0000-0000-000000000000',
        'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
      ];

      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        'dev',
        'acme-corp',
      ];

      validUUIDs.forEach((uuid) => {
        it(`should recognize "${uuid}" as a valid UUID`, async () => {
          mockReq.headers = { 'x-tenant-id': uuid };

          const middleware = tenantMiddleware({ required: true });

          await middleware(mockReq as Request, mockRes as Response, mockNext);

          expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
          expect((mockReq as any).tenantId).toBe(uuid);
        });
      });

      invalidUUIDs.forEach((value) => {
        it(`should treat "${value}" as a subdomain`, async () => {
          mockReq.headers = { 'x-tenant-id': value };
          (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
            id: 'resolved-uuid',
          });

          const middleware = tenantMiddleware({ required: true });

          await middleware(mockReq as Request, mockRes as Response, mockNext);

          expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
            where: { subdomain: value },
            select: { id: true },
          });
        });
      });
    });
  });
});
