/**
 * Feature Flags Routes
 *
 * API endpoints for managing feature flags and service modules.
 *
 * Public endpoints (tenant context required):
 * - GET /api/feature-flags - Get all flags for current tenant
 * - GET /api/feature-flags/:key - Check if specific flag is enabled
 *
 * Admin endpoints (super admin or tenant admin):
 * - GET /api/feature-flags/admin/all - Get all global flags
 * - POST /api/feature-flags/admin/flags - Create/update a flag
 * - PUT /api/feature-flags/admin/tenant/:tenantId/:key - Enable/disable for tenant
 */

import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getTenantFeatureFlags,
  getTenantServiceModules,
  isFeatureEnabled,
  enableFeatureForTenant,
  disableFeatureForTenant,
  getAllFeatureFlags,
  getTenantFlagOverrides,
  upsertFeatureFlag,
  seedDefaultFeatureFlags,
  SERVICE_MODULE_FLAGS,
  FEATURE_FLAGS,
} from '../services/feature-flag.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/feature-flags
 * Get all feature flags for the current tenant
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return next(new AppError('Tenant context required', 400));
    }

    const flags = await getTenantFeatureFlags(tenantId);

    res.json({
      success: true,
      data: {
        flags,
        serviceModules: Object.fromEntries(
          Object.entries(SERVICE_MODULE_FLAGS).map(([name, key]) => [
            key,
            flags[key] ?? false,
          ])
        ),
        features: Object.fromEntries(
          Object.entries(FEATURE_FLAGS).map(([name, key]) => [
            key,
            flags[key] ?? false,
          ])
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feature-flags/service-modules
 * Get service module flags for the current tenant
 */
router.get('/service-modules', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return next(new AppError('Tenant context required', 400));
    }

    const modules = await getTenantServiceModules(tenantId);

    res.json({
      success: true,
      data: modules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feature-flags/:key
 * Check if a specific feature flag is enabled
 */
router.get('/:key', async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId;
    const { key } = req.params;
    const userId = (req as any).user?.id;

    if (!tenantId) {
      return next(new AppError('Tenant context required', 400));
    }

    const enabled = await isFeatureEnabled(tenantId, key, userId);

    res.json({
      success: true,
      data: {
        key,
        enabled,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Admin Routes (require authentication)
// ============================================

/**
 * GET /api/feature-flags/admin/all
 * Get all global feature flags (super admin)
 */
router.get('/admin/all', authenticate, async (req, res, next) => {
  try {
    const flags = await getAllFeatureFlags();

    res.json({
      success: true,
      data: flags,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feature-flags/admin/tenant/:tenantId
 * Get tenant-specific flag overrides
 */
router.get('/admin/tenant/:tenantId', authenticate, async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const [flags, overrides] = await Promise.all([
      getTenantFeatureFlags(tenantId),
      getTenantFlagOverrides(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        effectiveFlags: flags,
        overrides,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/feature-flags/admin/flags
 * Create or update a global feature flag
 */
router.post('/admin/flags', authenticate, async (req, res, next) => {
  try {
    const { key, name, description, category, defaultEnabled, rolloutPercent } =
      req.body;

    if (!key || !name) {
      return next(new AppError('key and name are required', 400));
    }

    await upsertFeatureFlag(key, {
      name,
      description,
      category,
      defaultEnabled,
      rolloutPercent,
    });

    res.json({
      success: true,
      message: 'Feature flag saved',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/feature-flags/admin/tenant/:tenantId/:key/enable
 * Enable a feature for a specific tenant
 */
router.put(
  '/admin/tenant/:tenantId/:key/enable',
  authenticate,
  async (req, res, next) => {
    try {
      const { tenantId, key } = req.params;
      const { notes } = req.body;
      const staffId = (req as any).user?.id;

      await enableFeatureForTenant(tenantId, key, staffId, notes);

      logger.info('Feature enabled via admin API', { tenantId, key, staffId });

      res.json({
        success: true,
        message: `Feature ${key} enabled for tenant ${tenantId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/feature-flags/admin/tenant/:tenantId/:key/disable
 * Disable a feature for a specific tenant
 */
router.put(
  '/admin/tenant/:tenantId/:key/disable',
  authenticate,
  async (req, res, next) => {
    try {
      const { tenantId, key } = req.params;
      const { notes } = req.body;
      const staffId = (req as any).user?.id;

      await disableFeatureForTenant(tenantId, key, staffId, notes);

      logger.info('Feature disabled via admin API', { tenantId, key, staffId });

      res.json({
        success: true,
        message: `Feature ${key} disabled for tenant ${tenantId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/feature-flags/admin/seed
 * Seed default feature flags (one-time setup)
 */
router.post('/admin/seed', authenticate, async (req, res, next) => {
  try {
    await seedDefaultFeatureFlags();

    res.json({
      success: true,
      message: 'Default feature flags seeded',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
