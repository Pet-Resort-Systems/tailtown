import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { getCache, setCache, getCacheKey } from "../utils/redis";

// Extended Request type to include tenant info
export interface TenantRequest extends Request {
  tenantId?: string;
  tenant?: {
    id: string;
    subdomain: string;
    businessName: string;
    status: string;
    isActive: boolean;
  };
}

/**
 * Middleware to extract tenant from subdomain and attach to request
 *
 * Subdomain patterns:
 * - Production: {subdomain}.tailtown.com
 * - Development: localhost with X-Tenant-Subdomain header
 *
 * For development, you can:
 * 1. Use X-Tenant-Subdomain header
 * 2. Use ?subdomain=xxx query parameter
 * 3. Default to 'dev' tenant
 */
export const extractTenantContext = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let subdomain: string | null = null;

    // Method 1: Extract from subdomain (production)
    // Check X-Forwarded-Host first (from reverse proxy), then fall back to hostname
    const forwardedHost = req.headers["x-forwarded-host"] as string;
    const hostname = forwardedHost || req.hostname;

    logger.debug("Tenant middleware - hostname detection", {
      hostname,
      forwardedHost,
      original: req.hostname,
    });

    // Check if it's a subdomain (not localhost, not main domain, not IP)
    if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      !hostname.startsWith("192.168") &&
      !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      const parts = hostname.split(".");

      // If we have at least 3 parts (subdomain.domain.tld), extract subdomain
      if (parts.length >= 3) {
        subdomain = parts[0];
        logger.debug("Extracted subdomain from hostname", { subdomain });
      }
    }

    // Method 2: Development - Check X-Tenant-Subdomain header
    if (!subdomain && req.headers["x-tenant-subdomain"]) {
      subdomain = req.headers["x-tenant-subdomain"] as string;
      logger.debug("Using X-Tenant-Subdomain header", { subdomain });
    }

    // Method 2b: Check X-Tenant-ID header (for impersonation)
    if (!subdomain && req.headers["x-tenant-id"]) {
      subdomain = req.headers["x-tenant-id"] as string;
      logger.debug("Using X-Tenant-ID header", { subdomain });
    }

    // Method 3: Development - Check query parameter
    if (!subdomain && req.query.subdomain) {
      subdomain = req.query.subdomain as string;
      logger.debug("Using query parameter", { subdomain });
    }

    // Method 4: Default to dev tenant in non-production
    if (!subdomain && process.env.NODE_ENV !== "production") {
      subdomain = "dev";
      logger.debug("No tenant provided; defaulting to dev tenant", {
        hostname,
        path: req.path,
      });
    }

    // Method 5: Fail if no tenant context found
    if (!subdomain) {
      logger.error("No tenant context found", { hostname, path: req.path });
      return res.status(400).json({
        success: false,
        error: "Tenant required",
        message:
          "No tenant context found. Please access via subdomain or provide tenant ID.",
      });
    }

    // Try to get tenant from cache first
    const cacheKey = getCacheKey("global", "tenant", subdomain);
    let tenant = await getCache<{
      id: string;
      subdomain: string;
      businessName: string;
      status: string;
      isActive: boolean;
      isPaused: boolean;
    }>(cacheKey);

    // If not in cache, look up in database
    if (!tenant) {
      try {
        tenant = await prisma.tenant.findUnique({
          where: { subdomain },
          select: {
            id: true,
            subdomain: true,
            businessName: true,
            status: true,
            isActive: true,
            isPaused: true,
          },
        });

        // Cache the tenant for 5 minutes if found
        if (tenant) {
          await setCache(cacheKey, tenant, 300); // 5 min TTL
          logger.debug("Tenant cached", { subdomain, tenantId: tenant.id });
        }
      } catch (error: any) {
        // In development, if tenants table doesn't exist, create a mock tenant
        if (process.env.NODE_ENV !== "production" && error.code === "P2021") {
          logger.warn(
            "Tenants table does not exist - using mock tenant for development",
            { subdomain }
          );
          tenant = {
            id: "dev",
            subdomain: subdomain,
            businessName: "Development Tenant",
            status: "ACTIVE",
            isActive: true,
            isPaused: false,
          };
        } else {
          throw error;
        }
      }
    } else {
      logger.debug("Tenant cache hit", { subdomain, tenantId: tenant.id });
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: "Tenant not found",
        message: `No tenant found for subdomain: ${subdomain}`,
      });
    }

    // Check if tenant is active
    if (!tenant.isActive || tenant.isPaused) {
      return res.status(403).json({
        success: false,
        error: "Tenant inactive",
        message: "This tenant account is currently inactive or paused",
      });
    }

    // Attach tenant info to request
    // Use UUID as tenantId (proper tenant isolation)
    req.tenantId = tenant.id;
    req.tenant = {
      id: tenant.id,
      subdomain: tenant.subdomain,
      businessName: tenant.businessName,
      status: tenant.status,
      isActive: tenant.isActive,
    };

    logger.debug("Tenant context set", {
      businessName: tenant.businessName,
      subdomain: tenant.subdomain,
      tenantId: tenant.id,
    });

    next();
  } catch (error: any) {
    logger.error("Tenant middleware error", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to resolve tenant context",
      errorMessage: error.message,
      errorStack:
        process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }
};

/**
 * Middleware to require tenant context
 * Use this on routes that must have a tenant
 */
export const requireTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenantId || !req.tenant) {
    return res.status(400).json({
      success: false,
      error: "Tenant required",
      message: "This endpoint requires tenant context",
    });
  }
  next();
};

/**
 * Helper function to add tenantId to Prisma queries
 * Use this in your controllers to automatically filter by tenant
 */
export const withTenantId = (req: TenantRequest, additionalWhere: any = {}) => {
  return {
    ...additionalWhere,
    tenantId: req.tenantId,
  };
};

/**
 * Middleware to bypass tenant context (for super admin routes)
 * Use this on routes that should work across all tenants
 */
export const bypassTenantContext = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  // Just continue without tenant context
  next();
};
