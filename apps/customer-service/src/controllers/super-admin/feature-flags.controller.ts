/**
 * Super Admin Feature Flags Controller
 *
 * Manage global feature flags and tenant-specific overrides.
 */

import { Request, Response, NextFunction } from 'express';
import {
  getAllFeatureFlags,
  getTenantFeatureFlags,
  getTenantFlagOverrides,
  upsertFeatureFlag,
  enableFeatureForTenant,
  disableFeatureForTenant,
  seedDefaultFeatureFlags,
  SERVICE_MODULE_FLAGS,
  FEATURE_FLAGS,
} from '../../services/feature-flag.service';
import { logger } from '../../utils/logger';

/**
 * GET /super-admin/feature-flags
 * List all global feature flags
 */
export const listFeatureFlags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const flags = await getAllFeatureFlags();

    res.json({
      success: true,
      data: {
        flags,
        predefinedKeys: {
          serviceModules: SERVICE_MODULE_FLAGS,
          features: FEATURE_FLAGS,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /super-admin/feature-flags
 * Create or update a global feature flag
 */
export const createOrUpdateFlag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key, name, description, category, defaultEnabled, rolloutPercent } =
      req.body;

    if (!key || !name) {
      return res.status(400).json({
        success: false,
        error: 'key and name are required',
      });
    }

    await upsertFeatureFlag(key, {
      name,
      description,
      category,
      defaultEnabled,
      rolloutPercent,
    });

    const superAdmin = (req as any).superAdmin;
    logger.info('Feature flag created/updated by super admin', {
      key,
      superAdminId: superAdmin?.id,
    });

    res.json({
      success: true,
      message: `Feature flag '${key}' saved`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /super-admin/feature-flags/tenant/:tenantId
 * Get feature flags for a specific tenant
 */
export const getTenantFlags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId } = req.params;

    const [effectiveFlags, overrides] = await Promise.all([
      getTenantFeatureFlags(tenantId),
      getTenantFlagOverrides(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        tenantId,
        effectiveFlags,
        overrides,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /super-admin/feature-flags/tenant/:tenantId/:key/enable
 * Enable a feature for a tenant
 */
export const enableForTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId, key } = req.params;
    const { notes } = req.body;
    const superAdmin = (req as any).superAdmin;

    await enableFeatureForTenant(tenantId, key, superAdmin?.id, notes);

    logger.info('Feature enabled for tenant by super admin', {
      tenantId,
      key,
      superAdminId: superAdmin?.id,
    });

    res.json({
      success: true,
      message: `Feature '${key}' enabled for tenant ${tenantId}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /super-admin/feature-flags/tenant/:tenantId/:key/disable
 * Disable a feature for a tenant
 */
export const disableForTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId, key } = req.params;
    const { notes } = req.body;
    const superAdmin = (req as any).superAdmin;

    await disableFeatureForTenant(tenantId, key, superAdmin?.id, notes);

    logger.info('Feature disabled for tenant by super admin', {
      tenantId,
      key,
      superAdminId: superAdmin?.id,
    });

    res.json({
      success: true,
      message: `Feature '${key}' disabled for tenant ${tenantId}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /super-admin/feature-flags/seed
 * Seed default feature flags
 */
export const seedFlags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await seedDefaultFeatureFlags();

    const superAdmin = (req as any).superAdmin;
    logger.info('Default feature flags seeded by super admin', {
      superAdminId: superAdmin?.id,
    });

    res.json({
      success: true,
      message: 'Default feature flags seeded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /super-admin/feature-flags/tenant/:tenantId/bulk
 * Bulk update feature flags for a tenant
 */
export const bulkUpdateTenantFlags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId } = req.params;
    const { flags } = req.body; // { [key]: boolean }
    const { notes } = req.body;
    const superAdmin = (req as any).superAdmin;

    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'flags object is required',
      });
    }

    const results: { key: string; enabled: boolean; success: boolean }[] = [];

    for (const [key, enabled] of Object.entries(flags)) {
      try {
        if (enabled) {
          await enableFeatureForTenant(tenantId, key, superAdmin?.id, notes);
        } else {
          await disableFeatureForTenant(tenantId, key, superAdmin?.id, notes);
        }
        results.push({ key, enabled: enabled as boolean, success: true });
      } catch (error) {
        results.push({ key, enabled: enabled as boolean, success: false });
      }
    }

    logger.info('Bulk feature flag update by super admin', {
      tenantId,
      superAdminId: superAdmin?.id,
      results,
    });

    res.json({
      success: true,
      data: { results },
    });
  } catch (error) {
    next(error);
  }
};
