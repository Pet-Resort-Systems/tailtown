/**
 * Super Admin Authentication Controller
 * 
 * Handles login, logout, and token refresh for super admin users.
 * Includes audit logging for all authentication events.
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateTokenPair, verifyToken } from '../../utils/super-admin-jwt';
import { createAuditLog, AuditAction } from '../../services/audit-log.service';

const prisma = new PrismaClient();

/**
 * POST /api/super-admin/login
 * Authenticate super admin and return JWT tokens
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find super admin by email
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!superAdmin) {
      // Log failed login attempt (no super admin ID available)
      console.log(`[SuperAdmin] Failed login attempt for ${email}`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!superAdmin.isActive) {
      await createAuditLog({
        superAdminId: superAdmin.id,
        action: AuditAction.LOGIN_FAILED,
        details: { reason: 'Account inactive' }
      }, req);

      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, superAdmin.passwordHash);

    if (!isValidPassword) {
      await createAuditLog({
        superAdminId: superAdmin.id,
        action: AuditAction.LOGIN_FAILED,
        details: { reason: 'Invalid password' }
      }, req);

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const tokens = generateTokenPair({
      id: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role
    });

    // Update last login
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLogin: new Date() }
    });

    // Log successful login
    await createAuditLog({
      superAdminId: superAdmin.id,
      action: AuditAction.LOGIN
    }, req);

    // Return tokens and user info
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: superAdmin.id,
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          role: superAdmin.role
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('[SuperAdmin] Login error:', error);
    next(error);
  }
};

/**
 * POST /api/super-admin/logout
 * Log out super admin (audit log only, tokens are stateless)
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const superAdminId = (req as any).superAdmin?.id;

    if (superAdminId) {
      await createAuditLog({
        superAdminId,
        action: AuditAction.LOGOUT
      }, req);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('[SuperAdmin] Logout error:', error);
    next(error);
  }
};

/**
 * GET /api/super-admin/me
 * Get current super admin user info
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const superAdminId = (req as any).superAdmin?.id;

    if (!superAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: superAdmin
    });
  } catch (error) {
    console.error('[SuperAdmin] Get current user error:', error);
    next(error);
  }
};

/**
 * POST /api/super-admin/refresh
 * Refresh access token using refresh token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(token);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Get super admin
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: decoded.id }
    });

    if (!superAdmin || !superAdmin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive account'
      });
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      id: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'Invalid token')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('[SuperAdmin] Refresh token error:', error);
    next(error);
  }
};
