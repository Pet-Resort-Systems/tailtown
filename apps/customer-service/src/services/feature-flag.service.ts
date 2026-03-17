/**
 * Feature Flag Service
 *
 * Provides feature flag management with Redis caching for performance.
 * Supports:
 * - Global feature flags
 * - Per-tenant overrides
 * - Per-user overrides
 * - Service module toggles
 * - Gradual rollout (percentage-based)
 */

import { PrismaClient, FeatureFlagCategory } from '@prisma/client';
import { getCache, setCache, deleteCache } from '../utils/redis';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

// Predefined service module flags
export const SERVICE_MODULE_FLAGS = {
  BOARDING_DAYCARE: 'boarding_daycare',
  GROOMING: 'grooming_services',
  TRAINING: 'training_classes',
  POINT_OF_SALE: 'point_of_sale',
  RETAIL_INVENTORY: 'retail_inventory',
  REPORT_CARDS: 'report_cards',
} as const;

// Predefined feature flags
export const FEATURE_FLAGS = {
  AI_RECOMMENDATIONS: 'ai_recommendations',
  AI_PRICING: 'ai_pricing',
  AI_CHURN_PREDICTION: 'ai_churn_prediction',
  ADVANCED_REPORTS: 'advanced_reports',
  CUSTOMER_PORTAL: 'customer_portal',
  MOBILE_CHECKIN: 'mobile_checkin',
  SMS_NOTIFICATIONS: 'sms_notifications',
  EMAIL_MARKETING: 'email_marketing',
} as const;

export type ServiceModuleFlag =
  (typeof SERVICE_MODULE_FLAGS)[keyof typeof SERVICE_MODULE_FLAGS];
export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/**
 * Get cache key for tenant feature flags
 */
const getCacheKey = (tenantId: string): string => {
  return `feature_flags:${tenantId}`;
};

/**
 * Check if a feature is enabled for a tenant
 */
export const isFeatureEnabled = async (
  tenantId: string,
  flagKey: string,
  userId?: string
): Promise<boolean> => {
  try {
    // Try cache first
    const cacheKey = getCacheKey(tenantId);
    let cachedFlags = await getCache<Record<string, boolean>>(cacheKey);

    if (cachedFlags && flagKey in cachedFlags) {
      logger.debug('Feature flag cache hit', { tenantId, flagKey });
      return cachedFlags[flagKey];
    }

    // Get the global flag definition
    const flag = await prisma.featureFlag.findUnique({
      where: { key: flagKey },
      include: {
        tenantOverrides: {
          where: { tenantId },
        },
      },
    });

    if (!flag || !flag.isActive) {
      return false;
    }

    // Check tenant override first
    const tenantOverride = flag.tenantOverrides[0];
    if (tenantOverride) {
      // Check user-specific override if userId provided
      if (userId && tenantOverride.userOverrides) {
        const userOverrides = tenantOverride.userOverrides as {
          enabled?: string[];
          disabled?: string[];
        };

        if (userOverrides.disabled?.includes(userId)) {
          return false;
        }
        if (userOverrides.enabled?.includes(userId)) {
          return true;
        }
      }

      return tenantOverride.enabled;
    }

    // Use default or rollout percentage
    if (flag.rolloutPercent > 0 && flag.rolloutPercent < 100) {
      // Simple hash-based rollout
      const hash = hashString(`${tenantId}:${flagKey}`);
      return hash % 100 < flag.rolloutPercent;
    }

    return flag.defaultEnabled;
  } catch (error) {
    logger.error('Error checking feature flag', { tenantId, flagKey, error });
    return false;
  }
};

/**
 * Get all feature flags for a tenant (with caching)
 */
export const getTenantFeatureFlags = async (
  tenantId: string
): Promise<Record<string, boolean>> => {
  try {
    // Try cache first
    const cacheKey = getCacheKey(tenantId);
    const cached = await getCache<Record<string, boolean>>(cacheKey);

    if (cached) {
      logger.debug('Feature flags cache hit', { tenantId });
      return cached;
    }

    // Get all active flags with tenant overrides
    const flags = await prisma.featureFlag.findMany({
      where: { isActive: true },
      include: {
        tenantOverrides: {
          where: { tenantId },
        },
      },
    });

    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      const tenantOverride = flag.tenantOverrides[0];

      if (tenantOverride) {
        result[flag.key] = tenantOverride.enabled;
      } else if (flag.rolloutPercent > 0 && flag.rolloutPercent < 100) {
        const hash = hashString(`${tenantId}:${flag.key}`);
        result[flag.key] = hash % 100 < flag.rolloutPercent;
      } else {
        result[flag.key] = flag.defaultEnabled;
      }
    }

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL);

    return result;
  } catch (error) {
    logger.error('Error getting tenant feature flags', { tenantId, error });
    return {};
  }
};

/**
 * Get all service module flags for a tenant
 */
export const getTenantServiceModules = async (
  tenantId: string
): Promise<Record<string, boolean>> => {
  const allFlags = await getTenantFeatureFlags(tenantId);

  const serviceModules: Record<string, boolean> = {};
  for (const [name, key] of Object.entries(SERVICE_MODULE_FLAGS)) {
    serviceModules[key] = allFlags[key] ?? false;
  }

  return serviceModules;
};

/**
 * Enable a feature flag for a tenant
 */
export const enableFeatureForTenant = async (
  tenantId: string,
  flagKey: string,
  enabledBy?: string,
  notes?: string
): Promise<void> => {
  const flag = await prisma.featureFlag.findUnique({
    where: { key: flagKey },
  });

  if (!flag) {
    throw new Error(`Feature flag not found: ${flagKey}`);
  }

  await prisma.tenantFeatureFlag.upsert({
    where: {
      tenantId_featureFlagId: {
        tenantId,
        featureFlagId: flag.id,
      },
    },
    create: {
      tenantId,
      featureFlagId: flag.id,
      enabled: true,
      enabledBy,
      enabledAt: new Date(),
      notes,
    },
    update: {
      enabled: true,
      enabledBy,
      enabledAt: new Date(),
      disabledBy: null,
      disabledAt: null,
      notes,
    },
  });

  // Invalidate cache
  await deleteCache(getCacheKey(tenantId));

  logger.info('Feature enabled for tenant', { tenantId, flagKey, enabledBy });
};

/**
 * Disable a feature flag for a tenant
 */
export const disableFeatureForTenant = async (
  tenantId: string,
  flagKey: string,
  disabledBy?: string,
  notes?: string
): Promise<void> => {
  const flag = await prisma.featureFlag.findUnique({
    where: { key: flagKey },
  });

  if (!flag) {
    throw new Error(`Feature flag not found: ${flagKey}`);
  }

  await prisma.tenantFeatureFlag.upsert({
    where: {
      tenantId_featureFlagId: {
        tenantId,
        featureFlagId: flag.id,
      },
    },
    create: {
      tenantId,
      featureFlagId: flag.id,
      enabled: false,
      disabledBy,
      disabledAt: new Date(),
      notes,
    },
    update: {
      enabled: false,
      disabledBy,
      disabledAt: new Date(),
      notes,
    },
  });

  // Invalidate cache
  await deleteCache(getCacheKey(tenantId));

  logger.info('Feature disabled for tenant', { tenantId, flagKey, disabledBy });
};

/**
 * Create or update a global feature flag
 */
export const upsertFeatureFlag = async (
  key: string,
  data: {
    name: string;
    description?: string;
    category?: FeatureFlagCategory;
    defaultEnabled?: boolean;
    rolloutPercent?: number;
  }
): Promise<void> => {
  await prisma.featureFlag.upsert({
    where: { key },
    create: {
      key,
      name: data.name,
      description: data.description,
      category: data.category || 'FEATURE',
      defaultEnabled: data.defaultEnabled ?? false,
      rolloutPercent: data.rolloutPercent ?? 0,
    },
    update: {
      name: data.name,
      description: data.description,
      category: data.category,
      defaultEnabled: data.defaultEnabled,
      rolloutPercent: data.rolloutPercent,
    },
  });

  logger.info('Feature flag upserted', { key, data });
};

/**
 * Get all feature flags (for admin UI)
 */
export const getAllFeatureFlags = async () => {
  return prisma.featureFlag.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
};

/**
 * Get tenant feature flag overrides (for admin UI)
 */
export const getTenantFlagOverrides = async (tenantId: string) => {
  return prisma.tenantFeatureFlag.findMany({
    where: { tenantId },
    include: {
      featureFlag: true,
    },
  });
};

/**
 * Simple hash function for rollout percentage
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Seed default feature flags (call on startup or migration)
 */
export const seedDefaultFeatureFlags = async (): Promise<void> => {
  const defaultFlags = [
    // Service Modules
    {
      key: SERVICE_MODULE_FLAGS.BOARDING_DAYCARE,
      name: 'Boarding & Daycare',
      category: 'SERVICE_MODULE' as const,
      defaultEnabled: true,
      description: 'Core boarding and daycare reservation system',
    },
    {
      key: SERVICE_MODULE_FLAGS.GROOMING,
      name: 'Grooming Services',
      category: 'SERVICE_MODULE' as const,
      defaultEnabled: true,
      description: 'Grooming appointment scheduling',
    },
    {
      key: SERVICE_MODULE_FLAGS.TRAINING,
      name: 'Training Classes',
      category: 'SERVICE_MODULE' as const,
      defaultEnabled: false,
      description: 'Dog training class management',
    },
    {
      key: SERVICE_MODULE_FLAGS.POINT_OF_SALE,
      name: 'Point of Sale',
      category: 'SERVICE_MODULE' as const,
      defaultEnabled: false,
      description: 'In-store POS system',
    },
    {
      key: SERVICE_MODULE_FLAGS.RETAIL_INVENTORY,
      name: 'Retail Inventory',
      category: 'SERVICE_MODULE' as const,
      defaultEnabled: false,
      description: 'Product inventory management',
    },
    {
      key: SERVICE_MODULE_FLAGS.REPORT_CARDS,
      name: 'Report Cards',
      category: 'SERVICE_MODULE' as const,
      defaultEnabled: true,
      description: 'Pet report card system',
    },

    // Features
    {
      key: FEATURE_FLAGS.AI_RECOMMENDATIONS,
      name: 'AI Recommendations',
      category: 'FEATURE' as const,
      defaultEnabled: false,
      description: 'AI-powered booking recommendations',
    },
    {
      key: FEATURE_FLAGS.AI_PRICING,
      name: 'AI Pricing',
      category: 'FEATURE' as const,
      defaultEnabled: false,
      description: 'AI-powered dynamic pricing',
    },
    {
      key: FEATURE_FLAGS.AI_CHURN_PREDICTION,
      name: 'AI Churn Prediction',
      category: 'FEATURE' as const,
      defaultEnabled: false,
      description: 'Predict customer churn risk',
    },
    {
      key: FEATURE_FLAGS.ADVANCED_REPORTS,
      name: 'Advanced Reports',
      category: 'FEATURE' as const,
      defaultEnabled: true,
      description: 'Advanced reporting and analytics',
    },
    {
      key: FEATURE_FLAGS.CUSTOMER_PORTAL,
      name: 'Customer Portal',
      category: 'FEATURE' as const,
      defaultEnabled: true,
      description: 'Customer self-service portal',
    },
    {
      key: FEATURE_FLAGS.MOBILE_CHECKIN,
      name: 'Mobile Check-in',
      category: 'FEATURE' as const,
      defaultEnabled: true,
      description: 'Mobile check-in/check-out',
    },
    {
      key: FEATURE_FLAGS.SMS_NOTIFICATIONS,
      name: 'SMS Notifications',
      category: 'FEATURE' as const,
      defaultEnabled: false,
      description: 'SMS notification system',
    },
    {
      key: FEATURE_FLAGS.EMAIL_MARKETING,
      name: 'Email Marketing',
      category: 'FEATURE' as const,
      defaultEnabled: false,
      description: 'Email marketing campaigns',
    },
  ];

  for (const flag of defaultFlags) {
    await upsertFeatureFlag(flag.key, flag);
  }

  logger.info('Default feature flags seeded', { count: defaultFlags.length });
};
