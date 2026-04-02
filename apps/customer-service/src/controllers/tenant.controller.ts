import { type Request, type Response } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';
import {
  tenantService,
  type CreateTenantDto,
  type UpdateTenantDto,
} from '../services/tenant.service.js';
import { TenantStatus } from '../generated/prisma/client.js';
import { AppError } from '../middleware/error.middleware.js';
import { type AuthRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { deleteCache, getCacheKey } from '../utils/redis.js';

export class TenantController {
  /**
   * GET /api/tenants
   * Get all tenants with optional filtering
   */
  async getAllTenants(req: Request, res: Response) {
    try {
      const { status, isActive, isPaused } = req.query;

      const filters: any = {};
      if (status) filters.status = status as TenantStatus;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isPaused !== undefined) filters.isPaused = isPaused === 'true';

      const tenants = await tenantService.getAllTenants(filters);

      res.json({
        success: true,
        data: tenants,
        count: tenants.length,
      });
    } catch (error: any) {
      logger.error('Error fetching tenants', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenants',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/:id
   * Get tenant by ID
   */
  async getTenantById(req: Request, res: Response) {
    let tenantId: string | undefined;
    try {
      tenantId = assertStringRouteParam(
        req.params.id,
        req.originalUrl,
        AppError.validationError,
        'Tenant ID is required'
      );
      const tenant = await tenantService.getTenantById(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
      }

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      logger.error('Error fetching tenant', {
        tenantId,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/subdomain/:subdomain
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(req: Request, res: Response) {
    let subdomain: string | undefined;
    try {
      subdomain = assertStringRouteParam(
        req.params.subdomain,
        req.originalUrl,
        AppError.validationError,
        'Tenant subdomain is required'
      );
      const tenant = await tenantService.getTenantBySubdomain(subdomain);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
      }

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      logger.error('Error fetching tenant by subdomain', {
        subdomain,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/tenants
   * Create a new tenant
   */
  async createTenant(req: Request, res: Response) {
    try {
      const data: CreateTenantDto = req.body;

      // Validate required fields
      if (
        !data.businessName ||
        !data.subdomain ||
        !data.contactName ||
        !data.contactEmail ||
        !data.adminEmail ||
        !data.adminPassword ||
        !data.adminFirstName ||
        !data.adminLastName
      ) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: [
            'businessName',
            'subdomain',
            'contactName',
            'contactEmail',
            'adminEmail',
            'adminPassword',
            'adminFirstName',
            'adminLastName',
          ],
        });
      }

      // Validate subdomain format (lowercase, alphanumeric, hyphens only)
      const subdomainRegex = /^[a-z0-9-]+$/;
      if (!subdomainRegex.test(data.subdomain)) {
        return res.status(400).json({
          success: false,
          error:
            'Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.',
        });
      }

      const tenant = await tenantService.createTenant(data);

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant created successfully',
      });
    } catch (error: any) {
      console.error('Error creating tenant:', error);

      if (
        error.message.includes('already taken') ||
        error.message.includes('already registered')
      ) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create tenant',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/tenants/:id
   * Update tenant information
   */
  async updateTenant(req: Request, res: Response) {
    let tenantId: string | undefined;
    try {
      tenantId = assertStringRouteParam(
        req.params.id,
        req.originalUrl,
        AppError.validationError,
        'Tenant ID is required'
      );
      const data: UpdateTenantDto = req.body;

      const tenant = await tenantService.updateTenant(tenantId, data);

      // Invalidate tenant cache when updated
      if (tenant.subdomain) {
        const cacheKey = getCacheKey('global', 'tenant', tenant.subdomain);
        await deleteCache(cacheKey);
        logger.debug('Tenant cache invalidated', {
          subdomain: tenant.subdomain,
          tenantId,
        });
      }

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant updated successfully',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      logger.error('Error updating tenant', {
        tenantId,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update tenant',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/me
   * Get current tenant info (for merge fields, etc.)
   */
  async getCurrentTenant(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || (req as any).tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'No tenant ID found in request',
        });
      }

      const tenant = await tenantService.getTenantById(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
      }

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error: any) {
      logger.error('Error fetching current tenant', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant',
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/tenants/me/settings
   * Update current tenant's settings (timezone, etc.)
   */
  async updateCurrentTenantSettings(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'No tenant ID found in request',
        });
      }

      const data: UpdateTenantDto = req.body;

      const tenant = await tenantService.updateTenant(tenantId, data);

      res.json({
        success: true,
        data: tenant,
        message: 'Settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating tenant settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/tenants/:id/pause
   * Pause a tenant
   */
  async pauseTenant(req: Request, res: Response) {
    try {
      const id = assertStringRouteParam(
        req.params.id,
        req.originalUrl,
        AppError.validationError,
        'Tenant ID is required'
      );
      const tenant = await tenantService.pauseTenant(id);

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant paused successfully',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error pausing tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause tenant',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/tenants/:id/reactivate
   * Reactivate a paused tenant
   */
  async reactivateTenant(req: Request, res: Response) {
    try {
      const id = assertStringRouteParam(
        req.params.id,
        req.originalUrl,
        AppError.validationError,
        'Tenant ID is required'
      );
      const tenant = await tenantService.reactivateTenant(id);

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant reactivated successfully',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error reactivating tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate tenant',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/tenants/:id
   * Soft delete a tenant
   */
  async deleteTenant(req: Request, res: Response) {
    try {
      const id = assertStringRouteParam(
        req.params.id,
        req.originalUrl,
        AppError.validationError,
        'Tenant ID is required'
      );
      const tenant = await tenantService.deleteTenant(id);

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant deleted successfully',
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error deleting tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete tenant',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/:id/usage
   * Get tenant usage statistics
   */
  async getTenantUsage(req: Request, res: Response) {
    try {
      const id = assertStringRouteParam(
        req.params.id,
        req.originalUrl,
        AppError.validationError,
        'Tenant ID is required'
      );
      const usage = await tenantService.getTenantUsage(id);

      res.json({
        success: true,
        data: usage,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      console.error('Error fetching tenant usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant usage',
        message: error.message,
      });
    }
  }
}

export const tenantController = new TenantController();
