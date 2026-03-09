/**
 * Super Admin JWT Utilities
 * 
 * Handles JWT token generation and validation for super admin authentication.
 * Uses separate secret from regular staff tokens for additional security.
 */

import jwt from 'jsonwebtoken';

// Use separate secret for super admin tokens
const SUPER_ADMIN_JWT_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || 'super-admin-secret-change-in-production';
const JWT_EXPIRES_IN = '8h'; // 8 hour sessions
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 day refresh tokens

export interface SuperAdminTokenPayload {
  id: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

/**
 * Generate access token for super admin
 */
export function generateAccessToken(superAdmin: { id: string; email: string; role: string }): string {
  const payload: SuperAdminTokenPayload = {
    id: superAdmin.id,
    email: superAdmin.email,
    role: superAdmin.role,
    type: 'access'
  };

  return jwt.sign(payload, SUPER_ADMIN_JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'tailtown-super-admin',
    audience: 'tailtown-platform'
  });
}

/**
 * Generate refresh token for super admin
 */
export function generateRefreshToken(superAdmin: { id: string; email: string; role: string }): string {
  const payload: SuperAdminTokenPayload = {
    id: superAdmin.id,
    email: superAdmin.email,
    role: superAdmin.role,
    type: 'refresh'
  };

  return jwt.sign(payload, SUPER_ADMIN_JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'tailtown-super-admin',
    audience: 'tailtown-platform'
  });
}

/**
 * Verify and decode super admin token
 */
export function verifyToken(token: string): SuperAdminTokenPayload {
  try {
    const decoded = jwt.verify(token, SUPER_ADMIN_JWT_SECRET, {
      issuer: 'tailtown-super-admin',
      audience: 'tailtown-platform'
    }) as SuperAdminTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(superAdmin: { id: string; email: string; role: string }) {
  return {
    accessToken: generateAccessToken(superAdmin),
    refreshToken: generateRefreshToken(superAdmin)
  };
}
