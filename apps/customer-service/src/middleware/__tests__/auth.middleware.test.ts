import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, requireSuperAdmin, AuthRequest } from '../auth.middleware';
import * as jwt from '../../utils/jwt';

// Mock JWT utils
jest.mock('../../utils/jwt');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate with valid JWT token', () => {
      const mockDecoded = {
        id: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        tenantId: 'tenant1',
      };

      mockRequest.headers = {
        authorization: 'Bearer validtoken123',
      };

      (jwt.verifyToken as jest.Mock).mockReturnValue(mockDecoded);

      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(jwt.verifyToken).toHaveBeenCalledWith('validtoken123');
      expect(mockRequest.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'STAFF',
        tenantId: 'tenant1',
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should authenticate with valid API key', () => {
      process.env.SUPER_ADMIN_API_KEY = 'secret-key-123';
      mockRequest.headers = {
        'x-api-key': 'secret-key-123',
      };

      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        id: 'super-admin',
        email: 'admin@tailtown.com',
        role: 'SUPER_ADMIN',
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject invalid JWT token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalidtoken',
      };

      (jwt.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request without authentication', () => {
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should extract user from valid JWT token', () => {
      const mockDecoded = {
        id: 'user456',
        email: 'optional@example.com',
        role: 'MANAGER',
        tenantId: 'tenant2',
      };

      mockRequest.headers = {
        authorization: 'Bearer validtoken456',
      };

      (jwt.verifyToken as jest.Mock).mockReturnValue(mockDecoded);

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        id: 'user456',
        email: 'optional@example.com',
        role: 'MANAGER',
        tenantId: 'tenant2',
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalidtoken',
      };

      (jwt.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user when no token provided', () => {
      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow super admin', () => {
      mockRequest.user = {
        id: 'admin1',
        email: 'admin@example.com',
        role: 'SUPER_ADMIN',
      };

      requireSuperAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-super-admin', () => {
      mockRequest.user = {
        id: 'staff1',
        email: 'staff@example.com',
        role: 'STAFF',
      };

      requireSuperAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Forbidden',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      requireSuperAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
