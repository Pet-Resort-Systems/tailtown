/**
 * JWT utility for staff authentication
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = '8h'; // 8 hour access tokens
const JWT_REFRESH_EXPIRES_IN = '7d'; // 7 day refresh tokens

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'tailtown-staff',
    audience: 'tailtown-platform'
  });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'tailtown-staff',
      audience: 'tailtown-platform'
    }) as JWTPayload;
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
};

/**
 * Generate a refresh token
 */
export const generateRefreshToken = (payload: { id: string }): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'tailtown-staff',
    audience: 'tailtown-platform'
  });
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token: string): { id: string } => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'tailtown-staff',
      audience: 'tailtown-platform'
    }) as { id: string };
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};
