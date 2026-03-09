/**
 * Tenant Middleware
 * 
 * This middleware ensures proper multi-tenant isolation by requiring a tenantId
 * header in all requests. It implements our schema alignment strategy by
 * enforcing tenant isolation at the API level.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantIdOrSubdomain = req.headers['x-tenant-id'] as string;
    
    if (!tenantIdOrSubdomain) {
      logger.error('Request missing required x-tenant-id header');
      return next(new AppError('Tenant ID is required', 400));
    }
    
    // Check if it's a UUID or subdomain
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdOrSubdomain);
    
    let tenantId: string;
    
    if (isUUID) {
      // Already a UUID, use it directly
      tenantId = tenantIdOrSubdomain;
    } else {
      // It's a subdomain, look up the UUID
      const tenant = await prisma.tenant.findUnique({
        where: { subdomain: tenantIdOrSubdomain },
        select: { id: true }
      });
      
      if (!tenant) {
        logger.error(`Tenant not found for subdomain: ${tenantIdOrSubdomain}`);
        return next(new AppError('Tenant not found', 404));
      }
      
      tenantId = tenant.id;
    }
    
    // Attach UUID tenantId to request object for use in controllers
    req.tenantId = tenantId;
    
    next();
  } catch (error) {
    logger.error('Error in tenant middleware:', error);
    return next(new AppError('Failed to resolve tenant', 500));
  }
};
