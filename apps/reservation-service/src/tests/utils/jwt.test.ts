// @ts-nocheck
/**
 * Tests for jwt.ts
 *
 * Tests the JWT utility functions for staff authentication.
 */

import jwt from 'jsonwebtoken';
import {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  JWTPayload,
} from '../../utils/jwt';

describe('JWT utilities', () => {
  const mockPayload: JWTPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    tenantId: 'tenant-456',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.tenantId).toBe(mockPayload.tenantId);
    });

    it('should set correct issuer and audience', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iss).toBe('tailtown-staff');
      expect(decoded.aud).toBe('tailtown-platform');
    });

    it('should set expiration time', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.tenantId).toBe(mockPayload.tenantId);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('should throw error for tampered token', () => {
      const token = generateToken(mockPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tamperedToken)).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      // Create a token that's already expired
      const expiredToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        {
          expiresIn: '-1s',
          issuer: 'tailtown-staff',
          audience: 'tailtown-platform',
        }
      );

      expect(() => verifyToken(expiredToken)).toThrow('Token expired');
    });

    it('should throw error for wrong issuer', () => {
      const wrongIssuerToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        {
          expiresIn: '1h',
          issuer: 'wrong-issuer',
          audience: 'tailtown-platform',
        }
      );

      expect(() => verifyToken(wrongIssuerToken)).toThrow('Invalid token');
    });

    it('should throw error for wrong audience', () => {
      const wrongAudienceToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        {
          expiresIn: '1h',
          issuer: 'tailtown-staff',
          audience: 'wrong-audience',
        }
      );

      expect(() => verifyToken(wrongAudienceToken)).toThrow('Invalid token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken({ id: 'user-123' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user ID in token', () => {
      const token = generateRefreshToken({ id: 'user-123' });
      const decoded = jwt.decode(token) as any;

      expect(decoded.id).toBe('user-123');
    });

    it('should set longer expiration than access token', () => {
      const accessToken = generateToken(mockPayload);
      const refreshToken = generateRefreshToken({ id: 'user-123' });

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      const accessDuration = accessDecoded.exp - accessDecoded.iat;
      const refreshDuration = refreshDecoded.exp - refreshDecoded.iat;

      expect(refreshDuration).toBeGreaterThan(accessDuration);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken({ id: 'user-123' });
      const decoded = verifyRefreshToken(token);

      expect(decoded.id).toBe('user-123');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error for expired refresh token', () => {
      const expiredToken = jwt.sign(
        { id: 'user-123' },
        process.env.JWT_REFRESH_SECRET ||
          'your-refresh-secret-key-change-in-production',
        {
          expiresIn: '-1s',
          issuer: 'tailtown-staff',
          audience: 'tailtown-platform',
        }
      );

      expect(() => verifyRefreshToken(expiredToken)).toThrow(
        'Refresh token expired'
      );
    });

    it('should not accept access token as refresh token', () => {
      const accessToken = generateToken(mockPayload);

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('Token round-trip', () => {
    it('should generate and verify access token successfully', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should generate and verify refresh token successfully', () => {
      const token = generateRefreshToken({ id: 'user-123' });
      const decoded = verifyRefreshToken(token);

      expect(decoded.id).toBe('user-123');
    });
  });

  describe('JWTPayload interface', () => {
    it('should require all fields', () => {
      const payload: JWTPayload = {
        id: 'user-1',
        email: 'test@test.com',
        role: 'staff',
        tenantId: 'tenant-1',
      };

      expect(payload.id).toBeDefined();
      expect(payload.email).toBeDefined();
      expect(payload.role).toBeDefined();
      expect(payload.tenantId).toBeDefined();
    });
  });
});
