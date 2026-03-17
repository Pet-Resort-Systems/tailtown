// @ts-nocheck
/**
 * Tests for auditLog.ts
 *
 * Tests the audit logging utility for tracking tenant actions.
 */

import { Request, Response, NextFunction } from 'express';

// Mock dependencies
jest.mock('../../config/prisma', () => ({
  prisma: {},
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  auditLogger,
  AuditAction,
  AuditLogEntry,
  auditMiddleware,
} from '../../utils/auditLog';
import { logger } from '../../utils/logger';

describe('Audit Log utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuditAction enum', () => {
    it('should have customer actions', () => {
      expect(AuditAction.CUSTOMER_CREATED).toBe('customer.created');
      expect(AuditAction.CUSTOMER_UPDATED).toBe('customer.updated');
      expect(AuditAction.CUSTOMER_DELETED).toBe('customer.deleted');
      expect(AuditAction.CUSTOMER_VIEWED).toBe('customer.viewed');
    });

    it('should have pet actions', () => {
      expect(AuditAction.PET_CREATED).toBe('pet.created');
      expect(AuditAction.PET_UPDATED).toBe('pet.updated');
      expect(AuditAction.PET_DELETED).toBe('pet.deleted');
    });

    it('should have reservation actions', () => {
      expect(AuditAction.RESERVATION_CREATED).toBe('reservation.created');
      expect(AuditAction.RESERVATION_UPDATED).toBe('reservation.updated');
      expect(AuditAction.RESERVATION_CANCELLED).toBe('reservation.cancelled');
    });

    it('should have authentication actions', () => {
      expect(AuditAction.LOGIN_SUCCESS).toBe('auth.login.success');
      expect(AuditAction.LOGIN_FAILED).toBe('auth.login.failed');
      expect(AuditAction.LOGOUT).toBe('auth.logout');
      expect(AuditAction.PASSWORD_RESET).toBe('auth.password_reset');
    });

    it('should have admin actions', () => {
      expect(AuditAction.SETTINGS_UPDATED).toBe('admin.settings.updated');
      expect(AuditAction.USER_ROLE_CHANGED).toBe('admin.user.role_changed');
    });

    it('should have system actions', () => {
      expect(AuditAction.RATE_LIMIT_HIT).toBe('system.rate_limit.hit');
      expect(AuditAction.ERROR_OCCURRED).toBe('system.error.occurred');
    });
  });

  describe('auditLogger.log', () => {
    it('should log audit entry to logger', async () => {
      const entry: AuditLogEntry = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        action: AuditAction.CUSTOMER_CREATED,
        resourceType: 'customer',
        resourceId: 'cust-789',
        timestamp: new Date(),
      };

      await auditLogger.log(entry);

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          tenantId: 'tenant-123',
          action: AuditAction.CUSTOMER_CREATED,
        })
      );
    });

    it('should add timestamp if not provided', async () => {
      const entry: AuditLogEntry = {
        tenantId: 'tenant-123',
        action: AuditAction.CUSTOMER_VIEWED,
        timestamp: undefined as any,
      };

      await auditLogger.log(entry);

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          timestamp: expect.any(Date),
        })
      );
    });

    it('should include changes when provided', async () => {
      const changes = { name: { old: 'John', new: 'Jane' } };
      const entry: AuditLogEntry = {
        tenantId: 'tenant-123',
        action: AuditAction.CUSTOMER_UPDATED,
        changes,
        timestamp: new Date(),
      };

      await auditLogger.log(entry);

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          changes,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Force an error by making logger.info throw
      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      const entry: AuditLogEntry = {
        tenantId: 'tenant-123',
        action: AuditAction.CUSTOMER_CREATED,
        timestamp: new Date(),
      };

      // Should not throw
      await expect(auditLogger.log(entry)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        '[AUDIT ERROR]',
        expect.any(Object)
      );
    });
  });

  describe('auditLogger.logFromRequest', () => {
    it('should extract data from request', async () => {
      const mockReq = {
        tenantId: 'tenant-123',
        user: { id: 'user-456' },
        method: 'POST',
        path: '/api/customers',
        query: { include: 'pets' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      } as unknown as Request;

      await auditLogger.logFromRequest(
        mockReq,
        AuditAction.CUSTOMER_CREATED,
        'customer',
        'cust-789'
      );

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          tenantId: 'tenant-123',
          userId: 'user-456',
          action: AuditAction.CUSTOMER_CREATED,
          resourceType: 'customer',
          resourceId: 'cust-789',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      );
    });

    it('should handle missing tenantId', async () => {
      const mockReq = {
        method: 'GET',
        path: '/api/test',
        query: {},
        headers: {},
      } as unknown as Request;

      await auditLogger.logFromRequest(mockReq, AuditAction.CUSTOMER_VIEWED);

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          tenantId: 'unknown',
        })
      );
    });

    it('should include changes when provided', async () => {
      const mockReq = {
        tenantId: 'tenant-123',
        method: 'PUT',
        path: '/api/customers/123',
        query: {},
        headers: {},
      } as unknown as Request;

      const changes = { email: { old: 'old@test.com', new: 'new@test.com' } };

      await auditLogger.logFromRequest(
        mockReq,
        AuditAction.CUSTOMER_UPDATED,
        'customer',
        '123',
        changes
      );

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          changes,
        })
      );
    });
  });

  describe('auditLogger.logCustomerAction', () => {
    it('should log customer action with correct resource type', async () => {
      await auditLogger.logCustomerAction(
        'tenant-123',
        AuditAction.CUSTOMER_CREATED,
        'cust-456',
        { name: 'John Doe' },
        'user-789'
      );

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          tenantId: 'tenant-123',
          userId: 'user-789',
          action: AuditAction.CUSTOMER_CREATED,
          resourceType: 'customer',
          resourceId: 'cust-456',
          changes: { name: 'John Doe' },
        })
      );
    });
  });

  describe('auditLogger.logAuth', () => {
    it('should log successful authentication', async () => {
      await auditLogger.logAuth(
        AuditAction.LOGIN_SUCCESS,
        'user-123',
        'tenant-456',
        true,
        { method: 'password' }
      );

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          action: AuditAction.LOGIN_SUCCESS,
          userId: 'user-123',
          tenantId: 'tenant-456',
          metadata: expect.objectContaining({
            success: true,
            method: 'password',
          }),
        })
      );
    });

    it('should log failed authentication', async () => {
      await auditLogger.logAuth(
        AuditAction.LOGIN_FAILED,
        'user-123',
        'tenant-456',
        false,
        { reason: 'invalid_password' }
      );

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          action: AuditAction.LOGIN_FAILED,
          metadata: expect.objectContaining({
            success: false,
            reason: 'invalid_password',
          }),
        })
      );
    });
  });

  describe('auditLogger.logRateLimitHit', () => {
    it('should log rate limit hit', async () => {
      await auditLogger.logRateLimitHit(
        'tenant-123',
        '/api/reservations',
        '192.168.1.1'
      );

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          tenantId: 'tenant-123',
          action: AuditAction.RATE_LIMIT_HIT,
          metadata: { endpoint: '/api/reservations' },
          ipAddress: '192.168.1.1',
        })
      );
    });
  });

  describe('auditLogger.logError', () => {
    it('should log error with stack trace', async () => {
      const error = new Error('Something went wrong');

      await auditLogger.logError('tenant-123', error, { requestId: 'req-456' });

      expect(logger.info).toHaveBeenCalledWith(
        '[AUDIT]',
        expect.objectContaining({
          tenantId: 'tenant-123',
          action: AuditAction.ERROR_OCCURRED,
          metadata: expect.objectContaining({
            error: 'Something went wrong',
            stack: expect.any(String),
            requestId: 'req-456',
          }),
        })
      );
    });
  });

  describe('auditLogger.query', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const result = await auditLogger.query({
        tenantId: 'tenant-123',
        action: AuditAction.CUSTOMER_CREATED,
      });

      expect(result).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith(
        '[AUDIT QUERY]',
        expect.any(Object)
      );
    });
  });

  describe('auditLogger.getResourceAuditTrail', () => {
    it('should query with resource filters', async () => {
      const result = await auditLogger.getResourceAuditTrail(
        'tenant-123',
        'customer',
        'cust-456'
      );

      expect(result).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith(
        '[AUDIT QUERY]',
        expect.objectContaining({
          tenantId: 'tenant-123',
          resourceType: 'customer',
          resourceId: 'cust-456',
        })
      );
    });
  });

  describe('auditLogger.getUserActivity', () => {
    it('should query with user and date filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await auditLogger.getUserActivity(
        'tenant-123',
        'user-456',
        startDate,
        endDate
      );

      expect(result).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith(
        '[AUDIT QUERY]',
        expect.objectContaining({
          tenantId: 'tenant-123',
          userId: 'user-456',
          startDate,
          endDate,
        })
      );
    });
  });

  describe('auditLogger.getTenantActivitySummary', () => {
    it('should return empty summary (placeholder implementation)', async () => {
      const result = await auditLogger.getTenantActivitySummary(
        'tenant-123',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(result).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith(
        '[AUDIT SUMMARY]',
        expect.any(Object)
      );
    });
  });

  describe('auditMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: any;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        path: '/api/customers',
        method: 'POST',
        tenantId: 'tenant-123',
      };
      mockRes = {
        statusCode: 201,
        send: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('should skip health check endpoints', async () => {
      mockReq.path = '/health';

      const middleware = auditMiddleware();
      await middleware(mockReq as Request, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    it('should skip monitoring endpoints', async () => {
      mockReq.path = '/monitoring/metrics';

      const middleware = auditMiddleware();
      await middleware(mockReq as Request, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next for regular endpoints', async () => {
      const middleware = auditMiddleware();
      await middleware(mockReq as Request, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should override res.send', async () => {
      const originalSend = mockRes.send;

      const middleware = auditMiddleware();
      await middleware(mockReq as Request, mockRes, mockNext);

      expect(mockRes.send).not.toBe(originalSend);
    });
  });
});
