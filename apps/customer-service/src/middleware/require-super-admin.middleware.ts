/**
 * Super Admin Authentication Middleware
 * 
 * Protects routes that require super admin authentication.
 * Verifies JWT token and attaches super admin info to request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/super-admin-jwt';
import { logger } from '../utils/logger';

export interface SuperAdminRequest extends Request {
  superAdmin?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Require super admin authentication
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Attach super admin info to request
    (req as SuperAdminRequest).superAdmin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'Invalid token')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    logger.error('SuperAdmin auth middleware error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Require specific super admin role
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const superAdmin = (req as SuperAdminRequest).superAdmin;

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(superAdmin.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};
