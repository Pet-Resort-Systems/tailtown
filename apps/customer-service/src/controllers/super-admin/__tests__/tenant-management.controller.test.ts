/**
 * Tenant Management Controller Tests
 */

import { Request, Response } from 'express';
import {
  suspendTenant,
  activateTenant,
  deleteTenant,
  restoreTenant,
  getTenantStats,
} from '../tenant-management.controller';
import { PrismaClient } from '@prisma/client';
import * as auditLog from '../../../services/audit-log.service';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../services/audit-log.service');

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('Tenant Management Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      get: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    (mockReq as any).superAdmin = { id: 'admin-123' };
    jest.clearAllMocks();
  });

  describe('suspendTenant', () => {
    it('should return 400 if reason is missing', async () => {
      mockReq.params = { id: 'tenant-123' };
      mockReq.body = {};

      await suspendTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Suspension reason is required',
      });
    });

    it('should return 404 if tenant not found', async () => {
      mockReq.params = { id: 'tenant-123' };
      mockReq.body = { reason: 'Test reason' };
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await suspendTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Tenant not found',
      });
    });

    it('should suspend tenant successfully', async () => {
      const mockTenant = {
        id: 'tenant-123',
        businessName: 'Test Business',
        subdomain: 'test',
        status: 'ACTIVE',
      };

      mockReq.params = { id: 'tenant-123' };
      mockReq.body = { reason: 'Payment overdue' };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        status: 'PAUSED',
        isPaused: true,
      });

      await suspendTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: expect.objectContaining({
          status: 'PAUSED',
          isPaused: true,
          suspendedReason: 'Payment overdue',
          suspendedBy: 'admin-123',
        }),
      });
      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUSPEND_TENANT',
          entityId: 'tenant-123',
        }),
        mockReq
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('activateTenant', () => {
    it('should activate tenant successfully', async () => {
      const mockTenant = {
        id: 'tenant-123',
        businessName: 'Test Business',
        subdomain: 'test',
        status: 'PAUSED',
        isPaused: true,
      };

      mockReq.params = { id: 'tenant-123' };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        status: 'ACTIVE',
        isPaused: false,
      });

      await activateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          isPaused: false,
          pausedAt: null,
          suspendedAt: null,
          suspendedReason: null,
          suspendedBy: null,
        }),
      });
      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACTIVATE_TENANT',
        }),
        mockReq
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteTenant', () => {
    it('should soft delete tenant successfully', async () => {
      const mockTenant = {
        id: 'tenant-123',
        businessName: 'Test Business',
        subdomain: 'test',
        status: 'ACTIVE',
      };

      mockReq.params = { id: 'tenant-123' };
      mockReq.body = { reason: 'Account closed' };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        status: 'DELETED',
        isActive: false,
      });

      await deleteTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: expect.objectContaining({
          status: 'DELETED',
          isActive: false,
          deletedBy: 'admin-123',
        }),
      });
      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE_TENANT',
          details: expect.objectContaining({
            recoverable: true,
          }),
        }),
        mockReq
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('restoreTenant', () => {
    it('should return 400 if tenant is not deleted', async () => {
      const mockTenant = {
        id: 'tenant-123',
        status: 'ACTIVE',
      };

      mockReq.params = { id: 'tenant-123' };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await restoreTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Tenant is not deleted',
      });
    });

    it('should return 400 if beyond recovery period', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const mockTenant = {
        id: 'tenant-123',
        status: 'DELETED',
        deletedAt: twoYearsAgo,
      };

      mockReq.params = { id: 'tenant-123' };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await restoreTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Tenant is beyond recovery period (1 year)',
      });
    });

    it('should restore tenant successfully', async () => {
      const mockTenant = {
        id: 'tenant-123',
        businessName: 'Test Business',
        subdomain: 'test',
        status: 'DELETED',
        deletedAt: new Date(),
      };

      mockReq.params = { id: 'tenant-123' };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        status: 'ACTIVE',
        isActive: true,
        deletedAt: null,
      });

      await restoreTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          isActive: true,
          deletedAt: null,
          deletedBy: null,
        }),
      });
      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESTORE_TENANT',
        }),
        mockReq
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getTenantStats', () => {
    it('should return tenant statistics', async () => {
      const mockTenant = {
        id: 'tenant-123',
        employeeCount: 10,
        customerCount: 500,
        reservationCount: 1000,
        storageUsedMB: 250,
        status: 'ACTIVE',
        isActive: true,
        isPaused: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReq.params = { id: 'tenant-123' };
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await getTenantStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          employeeCount: 10,
          customerCount: 500,
          reservationCount: 1000,
          storageUsedMB: 250,
          status: 'ACTIVE',
          isActive: true,
          isPaused: false,
        }),
      });
    });
  });
});
