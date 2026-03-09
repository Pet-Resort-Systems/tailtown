/**
 * Super Admin Authentication Controller Tests
 */

import { Request, Response } from 'express';
import { login, logout, getCurrentUser, refreshToken } from '../auth.controller';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as jwt from '../../../utils/super-admin-jwt';
import * as auditLog from '../../../services/audit-log.service';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcrypt');
jest.mock('../../../utils/super-admin-jwt');
jest.mock('../../../services/audit-log.service');

const mockPrisma = {
  superAdmin: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('Super Admin Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      get: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 400 if email or password is missing', async () => {
      mockReq.body = { email: 'test@example.com' };

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required',
      });
    });

    it('should return 401 if super admin not found', async () => {
      mockReq.body = { email: 'test@example.com', password: 'password123' };
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return 401 if account is inactive', async () => {
      mockReq.body = { email: 'test@example.com', password: 'password123' };
      mockPrisma.superAdmin.findUnique.mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        isActive: false,
        passwordHash: 'hashedpassword',
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is inactive',
      });
      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          details: { reason: 'Account inactive' },
        }),
        mockReq
      );
    });

    it('should return 401 if password is invalid', async () => {
      mockReq.body = { email: 'test@example.com', password: 'wrongpassword' };
      mockPrisma.superAdmin.findUnique.mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        isActive: true,
        passwordHash: 'hashedpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          details: { reason: 'Invalid password' },
        }),
        mockReq
      );
    });

    it('should return tokens and user info on successful login', async () => {
      const mockSuperAdmin = {
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isActive: true,
        passwordHash: 'hashedpassword',
      };

      mockReq.body = { email: 'test@example.com', password: 'password123' };
      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue(mockSuperAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.generateTokenPair as jest.Mock).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.superAdmin.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { lastLogin: expect.any(Date) },
      });
      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN',
        }),
        mockReq
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: '123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'SUPER_ADMIN',
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });
    });
  });

  describe('logout', () => {
    it('should log audit and return success', async () => {
      (mockReq as any).superAdmin = { id: '123' };

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(auditLog.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT',
        }),
        mockReq
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return 401 if not authenticated', async () => {
      await getCurrentUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });

    it('should return user info if authenticated', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      };

      (mockReq as any).superAdmin = { id: '123' };
      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockUser);

      await getCurrentUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });
  });

  describe('refreshToken', () => {
    it('should return 400 if refresh token is missing', async () => {
      mockReq.body = {};

      await refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token is required',
      });
    });

    it('should return 401 if token type is invalid', async () => {
      mockReq.body = { refreshToken: 'invalid-token' };
      (jwt.verifyToken as jest.Mock).mockReturnValue({
        id: '123',
        type: 'access', // Wrong type
      });

      await refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token type',
      });
    });

    it('should return new tokens on valid refresh token', async () => {
      const mockSuperAdmin = {
        id: '123',
        email: 'test@example.com',
        role: 'SUPER_ADMIN',
        isActive: true,
      };

      mockReq.body = { refreshToken: 'valid-refresh-token' };
      (jwt.verifyToken as jest.Mock).mockReturnValue({
        id: '123',
        type: 'refresh',
      });
      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockSuperAdmin);
      (jwt.generateTokenPair as jest.Mock).mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });
    });
  });
});
