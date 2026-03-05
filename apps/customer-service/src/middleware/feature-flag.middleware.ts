/**
 * Feature Flag Middleware
 *
 * Provides middleware to protect routes based on feature flags.
 * Use this to conditionally enable/disable API endpoints per tenant.
 */

import { Request, Response, NextFunction } from "express";
import { isFeatureEnabled } from "../services/feature-flag.service";
import { AppError } from "./error.middleware";
import { logger } from "../utils/logger";

/**
 * Middleware factory to require a feature flag to be enabled
 *
 * Usage:
 * router.get('/grooming', requireFeature('grooming_services'), groomingController.list);
 */
export const requireFeature = (flagKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        return next(new AppError("Tenant context required", 400));
      }

      const userId = (req as any).user?.id;
      const enabled = await isFeatureEnabled(tenantId, flagKey, userId);

      if (!enabled) {
        logger.debug("Feature not enabled for tenant", { tenantId, flagKey });
        return next(
          new AppError(`This feature is not enabled for your organization`, 403)
        );
      }

      next();
    } catch (error) {
      logger.error("Error checking feature flag", { flagKey, error });
      next(error);
    }
  };
};

/**
 * Middleware factory to require a service module to be enabled
 * Same as requireFeature but with clearer naming for service modules
 */
export const requireServiceModule = requireFeature;

/**
 * Middleware to attach feature flags to request for use in controllers
 *
 * Usage:
 * router.use(attachFeatureFlags);
 * // Then in controller: req.featureFlags.grooming_services
 */
export const attachFeatureFlags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      (req as any).featureFlags = {};
      return next();
    }

    // Import here to avoid circular dependency
    const { getTenantFeatureFlags } = await import(
      "../services/feature-flag.service"
    );
    const flags = await getTenantFeatureFlags(tenantId);

    (req as any).featureFlags = flags;
    next();
  } catch (error) {
    logger.error("Error attaching feature flags", { error });
    (req as any).featureFlags = {};
    next();
  }
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      featureFlags?: Record<string, boolean>;
    }
  }
}
