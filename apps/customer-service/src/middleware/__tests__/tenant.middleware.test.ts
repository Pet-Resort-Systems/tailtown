import { Request, Response, NextFunction } from 'express';
import { extractTenantContext, requireTenant, TenantRequest } from '../tenant.middleware';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    tenant: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('Tenant Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let prisma: any;

  beforeEach(() => {
    // Reset mocks
    mockRequest = {
      headers: {},
      query: {},
      get hostname() { return 'localhost'; },
    } as any;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();

    // Get mocked prisma instance
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTenantContext', () => {
    it('should extract tenant from subdomain', async () => {
      Object.defineProperty(mockRequest, 'hostname', { value: 'brangro.canicloud.com', writable: true });
      
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'brangro',
        subdomain: 'brangro',
        name: 'BranGro',
        isActive: true,
      });

      await extractTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as TenantRequest).tenantId).toBe('brangro');
      expect((mockRequest as TenantRequest).tenant).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should extract tenant from X-Tenant-Subdomain header', async () => {
      mockRequest.headers = { 'x-tenant-subdomain': 'testclient' };
      
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'testclient',
        subdomain: 'testclient',
        name: 'Test Client',
        isActive: true,
      });

      await extractTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as TenantRequest).tenantId).toBe('testclient');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should extract tenant from query parameter', async () => {
      mockRequest.query = { tenant: 'queryclient' };
      
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'queryclient',
        subdomain: 'queryclient',
        name: 'Query Client',
        isActive: true,
      });

      await extractTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as TenantRequest).tenantId).toBe('queryclient');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should default to "dev" when no tenant specified', async () => {
      Object.defineProperty(mockRequest, 'hostname', { value: 'localhost', writable: true });
      
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'dev',
        subdomain: 'dev',
        name: 'Development',
        isActive: true,
      });

      await extractTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as TenantRequest).tenantId).toBe('dev');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle inactive tenant', async () => {
      Object.defineProperty(mockRequest, 'hostname', { value: 'inactive.canicloud.com', writable: true });
      
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'inactive',
        subdomain: 'inactive',
        name: 'Inactive Tenant',
        isActive: false,
      });

      await extractTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('suspended'),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle non-existent tenant', async () => {
      Object.defineProperty(mockRequest, 'hostname', { value: 'nonexistent.canicloud.com', writable: true });
      
      prisma.tenant.findUnique.mockResolvedValue(null);

      await extractTenantContext(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not found'),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireTenant', () => {
    it('should allow request with valid tenant', () => {
      (mockRequest as TenantRequest).tenantId = 'validtenant';

      requireTenant(
        mockRequest as TenantRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without tenant', () => {
      requireTenant(
        mockRequest as TenantRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Tenant context required'),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
