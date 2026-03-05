/**
 * Tenant CRUD Controller
 * 
 * Super admin operations for creating, listing, and cloning tenants.
 * Complements tenant-management.controller.ts (suspend/delete operations).
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog, AuditAction } from '../../services/audit-log.service';
import { SuperAdminRequest } from '../../middleware/require-super-admin.middleware';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * GET /api/super-admin/tenants
 * List all tenants with filtering and pagination
 */
export const listTenants = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { 
      page = '1', 
      limit = '50',
      status,
      isProduction,
      isTemplate,
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (isProduction !== undefined) {
      where.isProduction = isProduction === 'true';
    }
    
    if (isTemplate !== undefined) {
      where.isTemplate = isTemplate === 'true';
    }
    
    if (search) {
      where.OR = [
        { businessName: { contains: search as string, mode: 'insensitive' } },
        { subdomain: { contains: search as string, mode: 'insensitive' } },
        { contactEmail: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Get tenants
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { isProduction: 'desc' },
          { isTemplate: 'desc' },
          { createdAt: 'desc' }
        ],
        select: {
          id: true,
          businessName: true,
          subdomain: true,
          contactEmail: true,
          contactName: true,
          status: true,
          isActive: true,
          isPaused: true,
          isProduction: true,
          isTemplate: true,
          gingrSyncEnabled: true,
          lastGingrSyncAt: true,
          clonedFromId: true,
          planType: true,
          employeeCount: true,
          customerCount: true,
          reservationCount: true,
          createdAt: true,
          updatedAt: true,
          suspendedAt: true,
          deletedAt: true
        }
      }),
      prisma.tenant.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        tenants,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('[SuperAdmin] List tenants error:', error);
    next(error);
  }
};

/**
 * POST /api/super-admin/tenants
 * Create a new tenant
 */
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;
    const {
      businessName,
      subdomain,
      contactName,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      isProduction = false,
      isTemplate = false,
      gingrSyncEnabled = false,
      planType = 'STARTER'
    } = req.body;

    // Validate required fields
    if (!businessName || !subdomain || !contactName || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: businessName, subdomain, contactName, contactEmail'
      });
    }

    // Check if subdomain already exists
    const existing = await prisma.tenant.findUnique({
      where: { subdomain }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        businessName,
        subdomain,
        contactName,
        contactEmail,
        contactPhone,
        address,
        city,
        state,
        zipCode,
        isProduction,
        isTemplate,
        gingrSyncEnabled,
        planType,
        status: 'ACTIVE'
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId: superAdminId!,
      action: AuditAction.CREATE_TENANT,
      entityType: 'TENANT',
      entityId: tenant.id,
      tenantId: tenant.subdomain,
      details: { businessName, subdomain, isProduction, isTemplate }
    }, req);

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: tenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Create tenant error:', error);
    next(error);
  }
};

/**
 * POST /api/super-admin/tenants/:id/clone
 * Clone a tenant (typically from a template)
 */
export const cloneTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;
    const { id } = req.params;
    const {
      businessName,
      subdomain,
      contactName,
      contactEmail,
      contactPhone
    } = req.body;

    // Validate required fields
    if (!businessName || !subdomain || !contactName || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: businessName, subdomain, contactName, contactEmail'
      });
    }

    // Get source tenant
    const sourceTenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!sourceTenant) {
      return res.status(404).json({
        success: false,
        message: 'Source tenant not found'
      });
    }

    // Check if subdomain already exists
    const existing = await prisma.tenant.findUnique({
      where: { subdomain }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }

    // Clone tenant (copy settings but not data)
    const newTenant = await prisma.tenant.create({
      data: {
        businessName,
        subdomain,
        contactName,
        contactEmail,
        contactPhone,
        address: sourceTenant.address,
        city: sourceTenant.city,
        state: sourceTenant.state,
        zipCode: sourceTenant.zipCode,
        country: sourceTenant.country,
        planType: sourceTenant.planType,
        maxEmployees: sourceTenant.maxEmployees,
        maxLocations: sourceTenant.maxLocations,
        timezone: sourceTenant.timezone,
        currency: sourceTenant.currency,
        dateFormat: sourceTenant.dateFormat,
        timeFormat: sourceTenant.timeFormat,
        clonedFromId: sourceTenant.id,
        status: 'ACTIVE',
        isProduction: false,
        isTemplate: false,
        gingrSyncEnabled: false
      }
    });

    // Create audit log
    await createAuditLog({
      superAdminId: superAdminId!,
      action: AuditAction.CLONE_TENANT,
      entityType: 'TENANT',
      entityId: newTenant.id,
      tenantId: newTenant.subdomain,
      details: { 
        sourceId: sourceTenant.id,
        sourceName: sourceTenant.businessName,
        newName: businessName,
        newSubdomain: subdomain
      }
    }, req);

    res.status(201).json({
      success: true,
      message: 'Tenant cloned successfully',
      data: newTenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Clone tenant error:', error);
    next(error);
  }
};

/**
 * PATCH /api/super-admin/tenants/:id
 * Update tenant flags and settings
 */
export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const superAdminId = (req as SuperAdminRequest).superAdmin?.id;
    const { id } = req.params;
    const {
      isProduction,
      isTemplate,
      gingrSyncEnabled,
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      planType
    } = req.body;

    // Get existing tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Build update data
    const updateData: any = {};
    
    if (isProduction !== undefined) updateData.isProduction = isProduction;
    if (isTemplate !== undefined) updateData.isTemplate = isTemplate;
    if (gingrSyncEnabled !== undefined) updateData.gingrSyncEnabled = gingrSyncEnabled;
    if (businessName) updateData.businessName = businessName;
    if (contactName) updateData.contactName = contactName;
    if (contactEmail) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (planType) updateData.planType = planType;

    // Update tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData
    });

    // Create audit log
    await createAuditLog({
      superAdminId: superAdminId!,
      action: AuditAction.UPDATE_TENANT,
      entityType: 'TENANT',
      entityId: id,
      tenantId: tenant.subdomain,
      details: { changes: updateData }
    }, req);

    res.status(200).json({
      success: true,
      message: 'Tenant updated successfully',
      data: updatedTenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Update tenant error:', error);
    next(error);
  }
};

/**
 * GET /api/super-admin/tenants/:id
 * Get detailed tenant information
 */
export const getTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('[SuperAdmin] Get tenant error:', error);
    next(error);
  }
};
