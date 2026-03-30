import { type Request, type Response, type NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

// Extended Request type to include user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';
    tenantId?: string;
  };
}

/**
 * Simple authentication middleware
 * In production, this should validate JWT tokens or session cookies
 * For now, we'll use a simple API key approach
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers['authorization'] as string;

  // Prefer Bearer token auth when present
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      // Verify and decode JWT token
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role as
          | 'SUPER_ADMIN'
          | 'TENANT_ADMIN'
          | 'ADMIN'
          | 'MANAGER'
          | 'STAFF',
        tenantId: decoded.tenantId,
      };
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  }

  // For development: Accept a simple API key
  // In production: Validate JWT token
  const superAdminApiKey = process.env.SUPER_ADMIN_API_KEY;
  if (apiKey && superAdminApiKey && apiKey === superAdminApiKey) {
    req.user = {
      id: 'super-admin',
      email: 'admin@tailtown.com',
      role: 'SUPER_ADMIN',
    };
    return next();
  }

  // No valid authentication found
  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message:
      'Authentication required. Provide X-API-Key header or Bearer token.',
  });
};

/**
 * Middleware to check if user is a super admin
 * Must be used after authenticate middleware
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Super admin access required',
    });
  }

  next();
};

/**
 * Middleware to check if user is a tenant admin or higher
 */
export const requireTenantAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (
    !['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'Administrator'].includes(
      req.user.role
    )
  ) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }

  next();
};

/**
 * Middleware to ensure user can only access their own tenant data
 */
export const requireTenantAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  // Super admins can access any tenant
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Get tenant ID from request (could be in params, query, or body)
  const requestedTenantId =
    req.params.tenantId || req.query.tenantId || req.body.tenantId;

  // Check if user's tenant matches requested tenant
  if (req.user.tenantId !== requestedTenantId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied to this tenant',
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Extracts user info from JWT if present, but doesn't require it
 * Useful for endpoints that work with or without authentication
 */
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'] as string;

  // Check for Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      // Verify and decode JWT token
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role as
          | 'SUPER_ADMIN'
          | 'TENANT_ADMIN'
          | 'MANAGER'
          | 'STAFF',
        tenantId: decoded.tenantId,
      };
    } catch (error) {
      // Token invalid or expired - continue without user context
      // Don't throw error, just proceed without authentication
    }
  }

  // Continue regardless of authentication status
  next();
};
