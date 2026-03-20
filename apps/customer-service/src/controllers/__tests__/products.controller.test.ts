/**
 * Products Controller Unit Tests
 *
 * Comprehensive tests for product management, inventory tracking, and categories
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TenantRequest } from '../../middleware/tenant.middleware';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustInventory,
  getInventoryLogs,
  getLowStockProducts,
  getAllCategories,
  createCategory,
} from '../products.controller';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productCategory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    inventoryLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('Products Controller', () => {
  let mockRequest: Partial<TenantRequest>;
  let mockResponse: Partial<Response>;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      query: {},
      params: {},
      body: {},
      headers: { 'x-tenant-id': 'dev' },
      tenantId: 'dev',
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Get mocked Prisma instance
    mockPrisma = new PrismaClient();
  });

  describe('getAllProducts', () => {
    it('should return all products for a tenant', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          tenantId: 'dev',
          name: 'Dog Food',
          price: 49.99,
          currentStock: 50,
          category: { id: 'cat-1', name: 'Food & Treats' },
          packageContents: [],
        },
        {
          id: 'prod-2',
          tenantId: 'dev',
          name: 'Dog Toy',
          price: 12.99,
          currentStock: 100,
          category: { id: 'cat-2', name: 'Toys' },
          packageContents: [],
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      await getAllProducts(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'dev' },
        include: {
          category: true,
          packageContents: {
            include: {
              product: true,
            },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockProducts,
        cached: false,
      });
    });

    it('should filter products by category', async () => {
      mockRequest.query = { categoryId: 'cat-1' };

      await getAllProducts(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'dev',
            categoryId: 'cat-1',
          }),
        })
      );
    });

    it('should filter products by active status', async () => {
      mockRequest.query = { isActive: 'true' };

      await getAllProducts(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'dev',
            isActive: true,
          }),
        })
      );
    });

    it('should search products by name, SKU, or description', async () => {
      mockRequest.query = { search: 'dog' };

      await getAllProducts(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'dog', mode: 'insensitive' } },
              { sku: { contains: 'dog', mode: 'insensitive' } },
              { description: { contains: 'dog', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.product.findMany.mockRejectedValue(
        new Error('Database error')
      );

      await getAllProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to fetch products',
      });
    });
  });

  describe('getProductById', () => {
    it('should return a single product with details', async () => {
      const mockProduct = {
        id: 'prod-1',
        tenantId: 'dev',
        name: 'Dog Food',
        price: 49.99,
        category: { id: 'cat-1', name: 'Food & Treats' },
        packageContents: [],
        inventoryLogs: [],
      };

      mockRequest.params = { id: 'prod-1' };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      await getProductById(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-1', tenantId: 'dev' },
        include: {
          category: true,
          packageContents: {
            include: {
              product: true,
            },
          },
          inventoryLogs: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockProduct,
      });
    });

    it('should return 404 if product not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await getProductById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Product not found',
      });
    });
  });

  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const newProduct = {
        name: 'New Dog Toy',
        sku: 'DOG-TOY-001',
        price: 15.99,
        cost: 8.0,
        taxable: true,
        trackInventory: true,
        currentStock: 50,
        isService: false,
        isPackage: false,
      };

      const createdProduct = {
        id: 'prod-new',
        tenantId: 'dev',
        ...newProduct,
        category: null,
        packageContents: [],
      };

      mockRequest.body = newProduct;
      mockPrisma.product.findFirst.mockResolvedValue(null); // No duplicate SKU
      mockPrisma.product.create.mockResolvedValue(createdProduct);

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'dev',
          name: newProduct.name,
          sku: newProduct.sku,
          price: newProduct.price,
        }),
        include: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: createdProduct,
      });
    });

    it('should reject duplicate SKU', async () => {
      mockRequest.body = {
        name: 'Product',
        sku: 'DUPLICATE-SKU',
        price: 10.0,
      };

      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'existing',
        sku: 'DUPLICATE-SKU',
      });

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'A product with this SKU already exists',
      });
    });

    it('should require name and price', async () => {
      mockRequest.body = { sku: 'TEST' };

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Name and price are required',
      });
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      const existingProduct = {
        id: 'prod-1',
        tenantId: 'dev',
        name: 'Old Name',
        sku: 'OLD-SKU',
        price: 10.0,
      };

      const updates = {
        name: 'New Name',
        price: 15.0,
      };

      const updatedProduct = {
        ...existingProduct,
        ...updates,
      };

      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = updates;
      mockPrisma.product.findFirst.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue(updatedProduct);

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.objectContaining(updates),
        include: expect.any(Object),
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: updatedProduct,
      });
    });

    it('should return 404 if product not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { name: 'Test' };
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Product not found',
      });
    });

    it('should prevent duplicate SKU when updating', async () => {
      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = { sku: 'DUPLICATE' };

      mockPrisma.product.findFirst
        .mockResolvedValueOnce({ id: 'prod-1', sku: 'ORIGINAL' }) // Existing product
        .mockResolvedValueOnce({ id: 'prod-2', sku: 'DUPLICATE' }); // Duplicate check

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'A product with this SKU already exists',
      });
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      mockRequest.params = { id: 'prod-1' };
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        tenantId: 'dev',
      });
      mockPrisma.product.delete.mockResolvedValue({ id: 'prod-1' });

      await deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Product deleted successfully',
      });
    });

    it('should return 404 if product not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('adjustInventory', () => {
    it('should increase inventory correctly', async () => {
      const product = {
        id: 'prod-1',
        tenantId: 'dev',
        currentStock: 50,
        trackInventory: true,
      };

      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = {
        quantity: 20,
        changeType: 'PURCHASE',
        reason: 'New stock received',
      };

      mockPrisma.product.findFirst.mockResolvedValue(product);
      mockPrisma.product.update.mockResolvedValue({
        ...product,
        currentStock: 70,
      });
      mockPrisma.inventoryLog.create.mockResolvedValue({});

      await adjustInventory(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { currentStock: 70 },
      });

      expect(mockPrisma.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'dev',
          productId: 'prod-1',
          changeType: 'PURCHASE',
          quantity: 20,
          previousStock: 50,
          newStock: 70,
          reason: 'New stock received',
        }),
      });
    });

    it('should decrease inventory correctly', async () => {
      const product = {
        id: 'prod-1',
        tenantId: 'dev',
        currentStock: 50,
        trackInventory: true,
      };

      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = {
        quantity: -10,
        changeType: 'SALE',
        reason: 'Sold to customer',
      };

      mockPrisma.product.findFirst.mockResolvedValue(product);
      mockPrisma.product.update.mockResolvedValue({
        ...product,
        currentStock: 40,
      });
      mockPrisma.inventoryLog.create.mockResolvedValue({});

      await adjustInventory(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { currentStock: 40 },
      });
    });

    it('should prevent negative inventory', async () => {
      const product = {
        id: 'prod-1',
        tenantId: 'dev',
        currentStock: 5,
        trackInventory: true,
      };

      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = {
        quantity: -10,
        changeType: 'SALE',
      };

      mockPrisma.product.findFirst.mockResolvedValue(product);

      await adjustInventory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Insufficient inventory',
      });
    });

    it('should reject adjustment for non-inventory products', async () => {
      const product = {
        id: 'prod-1',
        tenantId: 'dev',
        trackInventory: false,
      };

      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = { quantity: 10, changeType: 'ADJUSTMENT' };

      mockPrisma.product.findFirst.mockResolvedValue(product);

      await adjustInventory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This product does not track inventory',
      });
    });

    it('should require quantity and changeType', async () => {
      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = {};

      await adjustInventory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Quantity and change type are required',
      });
    });
  });

  describe('getInventoryLogs', () => {
    it('should return inventory logs for a product', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          productId: 'prod-1',
          changeType: 'SALE',
          quantity: -5,
          previousStock: 50,
          newStock: 45,
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          productId: 'prod-1',
          changeType: 'PURCHASE',
          quantity: 20,
          previousStock: 45,
          newStock: 65,
          createdAt: new Date(),
        },
      ];

      mockRequest.params = { id: 'prod-1' };
      mockPrisma.inventoryLog.findMany.mockResolvedValue(mockLogs);

      await getInventoryLogs(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.inventoryLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'dev',
          productId: 'prod-1',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockLogs,
      });
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Low Stock Item',
          currentStock: 5,
          lowStockAlert: 10,
          trackInventory: true,
          isActive: true,
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      await getLowStockProducts(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'dev',
            isActive: true,
            trackInventory: true,
          }),
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockProducts,
      });
    });
  });

  describe('getAllCategories', () => {
    it('should return all active categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Food & Treats', _count: { products: 5 } },
        { id: 'cat-2', name: 'Toys', _count: { products: 10 } },
      ];

      mockPrisma.productCategory.findMany.mockResolvedValue(mockCategories);

      await getAllCategories(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.productCategory.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'dev',
          isActive: true,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockCategories,
      });
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const newCategory = {
        name: 'Training Equipment',
        description: 'Equipment for training classes',
        displayOrder: 10,
      };

      const createdCategory = {
        id: 'cat-new',
        tenantId: 'dev',
        ...newCategory,
        isActive: true,
      };

      mockRequest.body = newCategory;
      mockPrisma.productCategory.create.mockResolvedValue(createdCategory);

      await createCategory(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.productCategory.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'dev',
          name: newCategory.name,
          description: newCategory.description,
          displayOrder: newCategory.displayOrder,
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: createdCategory,
      });
    });

    it('should require category name', async () => {
      mockRequest.body = { description: 'Test' };

      await createCategory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Name is required',
      });
    });
  });
});
