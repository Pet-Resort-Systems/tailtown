/**
 * Tenant Management Controller
 * 
 * Super admin operations for managing tenant accounts:
 * - Suspend/activate tenants
 * - Soft delete tenants (recoverable for 1 year)
 * - View tenant statistics
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, AuditAction } from '../../services/audit-log.service';
import { SuperAdminRequest } from '../../middleware/require-super-admin.middleware';

const prisma = new PrismaClient();

/**
 * POST /api/super-admin/tenants/:id/suspend
 * Suspend a tenant account
 */
export const suspendTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Update tenant status
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'PAUSED',
        isPaused: true,
        pausedAt: new Date(),
        suspendedAt: new Date(),
        suspendedReason: reason,
        suspendedBy: superAdminId
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId,
      action: AuditAction.SUSPEND_TENANT,
      entityType: 'TENANT',
      entityId: id,
      tenantId: tenant.subdomain,
      details: { reason, businessName: tenant.businessName }
    }, req);

    res.status(200).json({
      success: true,
      message: 'Tenant suspended successfully',
      data: updatedTenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Suspend tenant error:', error);
    next(error);
  }
};

/**
 * POST /api/super-admin/tenants/:id/activate
 * Activate a suspended tenant
 */
export const activateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Update tenant status
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isPaused: false,
        pausedAt: null,
        suspendedAt: null,
        suspendedReason: null,
        suspendedBy: null
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId,
      action: AuditAction.ACTIVATE_TENANT,
      entityType: 'TENANT',
      entityId: id,
      tenantId: tenant.subdomain,
      details: { businessName: tenant.businessName }
    }, req);

    res.status(200).json({
      success: true,
      message: 'Tenant activated successfully',
      data: updatedTenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Activate tenant error:', error);
    next(error);
  }
};

/**
 * DELETE /api/super-admin/tenants/:id
 * Soft delete a tenant (recoverable for 1 year)
 */
export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Soft delete tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'DELETED',
        isActive: false,
        deletedAt: new Date(),
        deletedBy: superAdminId
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId,
      action: AuditAction.DELETE_TENANT,
      entityType: 'TENANT',
      entityId: id,
      tenantId: tenant.subdomain,
      details: { 
        reason: reason || 'No reason provided',
        businessName: tenant.businessName,
        recoverable: true,
        recoverableUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      }
    }, req);

    res.status(200).json({
      success: true,
      message: 'Tenant deleted successfully (recoverable for 1 year)',
      data: updatedTenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Delete tenant error:', error);
    next(error);
  }
};

/**
 * POST /api/super-admin/tenants/:id/restore
 * Restore a soft-deleted tenant
 */
export const restoreTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    if (tenant.status !== 'DELETED') {
      return res.status(400).json({
        success: false,
        message: 'Tenant is not deleted'
      });
    }

    // Check if within recovery period (1 year)
    if (tenant.deletedAt) {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      if (tenant.deletedAt < oneYearAgo) {
        return res.status(400).json({
          success: false,
          message: 'Tenant is beyond recovery period (1 year)'
        });
      }
    }

    // Restore tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isActive: true,
        deletedAt: null,
        deletedBy: null
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId,
      action: 'RESTORE_TENANT',
      entityType: 'TENANT',
      entityId: id,
      tenantId: tenant.subdomain,
      details: { businessName: tenant.businessName }
    }, req);

    res.status(200).json({
      success: true,
      message: 'Tenant restored successfully',
      data: updatedTenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Restore tenant error:', error);
    next(error);
  }
};

/**
 * GET /api/super-admin/tenants/:id/stats
 * Get tenant statistics
 */
export const getTenantStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Get counts (these would come from tenant-specific queries in production)
    const stats = {
      employeeCount: tenant.employeeCount || 0,
      customerCount: tenant.customerCount || 0,
      reservationCount: tenant.reservationCount || 0,
      storageUsedMB: tenant.storageUsedMB || 0,
      status: tenant.status,
      isActive: tenant.isActive,
      isPaused: tenant.isPaused,
      createdAt: tenant.createdAt,
      lastActivity: tenant.updatedAt
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[SuperAdmin] Get tenant stats error:', error);
    next(error);
  }
};
