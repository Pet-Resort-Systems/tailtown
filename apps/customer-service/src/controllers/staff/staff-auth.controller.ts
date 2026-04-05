import { env } from '../../env.js';
/**
 * Staff Authentication Controller
 *
 * Handles authentication operations:
 * - loginStaff
 * - requestPasswordReset
 * - resetPassword
 * - refreshAccessToken
 */

import { type Request, type Response, type NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware.js';
import bcrypt from 'bcrypt';
import { validatePasswordOrThrow } from '../../utils/passwordValidator.js';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';
import { logger } from '../../utils/logger.js';
import { type TenantRequest } from '../../middleware/tenant.middleware.js';
import { prisma } from '../../config/prisma.js';
import {
  tenantAuditLog,
  AuditAction,
} from '../../services/tenant-audit-log.service.js';

/**
 * Authenticate staff member (login)
 */
export const loginStaff = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const tenantId = req.tenantId;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find staff by email
    const staff = await prisma.staff.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!staff || !staff.isActive) {
      // Audit log failed login attempt
      await tenantAuditLog.logAuth(
        req,
        AuditAction.LOGIN_FAILED,
        undefined,
        email,
        {
          metadata: { reason: !staff ? 'user_not_found' : 'inactive_account' },
          success: false,
        }
      );
      return next(new AppError('Invalid credentials or inactive account', 401));
    }

    // Check if account is locked
    if (
      (staff as any).lockedUntil &&
      new Date((staff as any).lockedUntil) > new Date()
    ) {
      return res.status(423).json({
        status: 'error',
        message:
          'Account is locked due to too many failed login attempts. Please try again later.',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: (staff as any).lockedUntil,
      });
    }

    // DEVELOPMENT MODE: Bypass password verification for testing
    const isDev = env.NODE_ENV !== 'production';
    const isPasswordCorrect = isDev
      ? true
      : await bcrypt.compare(password, (staff as any).password);

    if (!isPasswordCorrect) {
      // Increment failed login attempts
      const failedAttempts = ((staff as any).failedLoginAttempts || 0) + 1;
      const updates: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: new Date(),
      };

      // Lock account after 5 failed attempts (15 minutes lockout)
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await prisma.staff.update({
        where: { id: staff.id },
        data: updates,
      });

      // Audit log failed login (wrong password)
      await tenantAuditLog.logAuth(
        req,
        AuditAction.LOGIN_FAILED,
        staff.id,
        email,
        {
          metadata: { reason: 'invalid_password', failedAttempts },
          success: false,
        }
      );

      return next(new AppError('Invalid credentials', 401));
    }

    // Update last login time and reset failed attempts
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null,
      } as any,
    });

    // Generate JWT access token
    const accessToken = generateToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      tenantId,
    });

    // Generate refresh token
    const refreshToken = generateRefreshToken({ id: staff.id });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        staffId: staff.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create response data without sensitive fields
    const staffData = {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      specialties: staff.specialties,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      position: (staff as any).position,
      department: (staff as any).department,
      hireDate: (staff as any).hireDate,
      profilePhoto: (staff as any).profilePhoto,
    };

    // Audit log successful login
    await tenantAuditLog.logAuth(req, AuditAction.LOGIN, staff.id, email, {
      success: true,
    });

    res.status(200).json({
      status: 'success',
      data: staffData,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Please provide email', 400));
    }

    // Find staff by email
    const staff = await prisma.staff.findFirst({
      where: { email },
    });

    if (!staff || !staff.isActive) {
      // For security, don't reveal if the email exists
      return res.status(200).json({
        status: 'success',
        message:
          'If your email is registered, you will receive a password reset link',
      });
    }

    // Generate reset token
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Set token expiry to 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        resetToken,
        resetTokenExpiry,
      } as any,
    });

    // TODO: Send email with reset link
    if (env.NODE_ENV === 'development') {
      logger.debug('Password reset token generated', {
        email: staff.email,
        resetLink: `http://localhost:3000/reset-password?token=${resetToken}`,
      });
    }

    res.status(200).json({
      status: 'success',
      message:
        'If your email is registered, you will receive a password reset link',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return next(new AppError('Please provide token and new password', 400));
    }

    // Find staff by reset token
    const staff = await prisma.staff.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      } as any,
    });

    if (!staff) {
      return next(new AppError('Invalid or expired token', 400));
    }

    // Validate password strength
    try {
      validatePasswordOrThrow(password);
    } catch (error: any) {
      return next(new AppError(error.message, 400));
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      } as any,
    });

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { staff: true },
    });

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresAt < new Date()
    ) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    // Check if staff is still active
    if (!storedToken.staff.isActive) {
      return next(new AppError('Account is inactive', 401));
    }

    // Revoke old refresh token (token rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new access token
    const newAccessToken = generateToken({
      id: storedToken.staff.id,
      email: storedToken.staff.email,
      role: storedToken.staff.role,
      tenantId: storedToken.staff.tenantId,
    });

    // Generate new refresh token
    const newRefreshToken = generateRefreshToken({ id: storedToken.staff.id });

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        staffId: storedToken.staff.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(200).json({
      status: 'success',
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};
