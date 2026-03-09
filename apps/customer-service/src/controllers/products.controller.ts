import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TenantRequest } from '../middleware/tenant.middleware';
import { getCache, setCache, getCacheKey, deleteCachePattern } from '../utils/redis';

const prisma = new PrismaClient();

// ============================================
// PRODUCT CRUD
// ============================================

/**
 * Get all products for the current tenant
 * Supports filtering by category, active status, and search term
 * @param req - TenantRequest with tenant context from middleware
 * @param res - Express response
 * @returns List of products with category information
 */
export const getAllProducts = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { categoryId, isActive, search } = req.query;
    
    // Generate cache key based on query parameters
    const cacheKeySuffix = `${categoryId || 'all'}:${isActive || 'all'}:${search || 'none'}`;
    const cacheKey = getCacheKey(tenantId, 'products', cacheKeySuffix);
    
    // Try to get from cache first
    const cachedProducts = await getCache<any[]>(cacheKey);
    if (cachedProducts) {
      return res.json({
        status: 'success',
        data: cachedProducts,
        cached: true
      });
    }
    
    const where: any = { tenantId };
    
    if (categoryId) where.categoryId = categoryId as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        packageContents: {
          include: {
            product: true
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { name: 'asc' }
      ]
    });
    
    // Cache the results for 5 minutes
    await setCache(cacheKey, products, 300);
    
    res.json({
      status: 'success',
      data: products,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products'
    });
  }
};

// Get single product
export const getProductById = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        packageContents: {
          include: {
            product: true
          }
        },
        inventoryLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    res.json({
      status: 'success',
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product'
    });
  }
};

// Create product
export const createProduct = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const {
      sku,
      name,
      description,
      categoryId,
      price,
      cost,
      taxable,
      trackInventory,
      currentStock,
      lowStockAlert,
      reorderPoint,
      reorderQuantity,
      isService,
      isPackage,
      isFeatured,
      imageUrl,
      barcode,
      notes,
      packageItems
    } = req.body;
    
    // Validate required fields
    if (!name || price === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and price are required'
      });
    }
    
    // Check for duplicate SKU
    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { tenantId, sku }
      });
      
      if (existing) {
        return res.status(400).json({
          status: 'error',
          message: 'A product with this SKU already exists'
        });
      }
    }
    
    // Create product with optional package items
    const product = await prisma.product.create({
      data: {
        tenantId,
        sku,
        name,
        description,
        categoryId,
        price,
        cost,
        taxable: taxable !== undefined ? taxable : true,
        trackInventory: trackInventory !== undefined ? trackInventory : true,
        currentStock: currentStock || 0,
        lowStockAlert,
        reorderPoint,
        reorderQuantity,
        isService: isService || false,
        isPackage: isPackage || false,
        isFeatured: isFeatured || false,
        imageUrl,
        barcode,
        notes,
        packageContents: packageItems ? {
          create: packageItems.map((item: any) => ({
            tenantId,
            productId: item.productId,
            quantity: item.quantity
          }))
        } : undefined
      },
      include: {
        category: true,
        packageContents: {
          include: {
            product: true
          }
        }
      }
    });
    
    // Create initial inventory log if tracking inventory
    if (trackInventory && currentStock > 0) {
      await prisma.inventoryLog.create({
        data: {
          tenantId,
          productId: product.id,
          changeType: 'RESTOCK',
          quantity: currentStock,
          previousStock: 0,
          newStock: currentStock,
          reason: 'Initial stock'
        }
      });
    }
    
    // Invalidate products cache for this tenant
    await deleteCachePattern(`${tenantId}:products:*`);
    
    res.status(201).json({
      status: 'success',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create product'
    });
  }
};

// Update product
export const updateProduct = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Check if product exists
    const existing = await prisma.product.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    const {
      sku,
      name,
      description,
      categoryId,
      price,
      cost,
      taxable,
      trackInventory,
      currentStock,
      lowStockAlert,
      reorderPoint,
      reorderQuantity,
      isService,
      isPackage,
      isActive,
      isFeatured,
      imageUrl,
      barcode,
      notes
    } = req.body;
    
    // Check for duplicate SKU if changing
    if (sku && sku !== existing.sku) {
      const duplicate = await prisma.product.findFirst({
        where: { tenantId, sku, id: { not: id } }
      });
      
      if (duplicate) {
        return res.status(400).json({
          status: 'error',
          message: 'A product with this SKU already exists'
        });
      }
    }
    
    // Build update data object, only including fields that are provided
    const updateData: any = {
      name,
      description,
      categoryId,
      price,
      cost,
      taxable,
      trackInventory,
      currentStock,
      lowStockAlert,
      reorderPoint,
      reorderQuantity,
      isService,
      isPackage,
      isActive,
      isFeatured,
      imageUrl,
      barcode,
      notes
    };
    
    // Only include SKU if it's provided (not null/empty)
    if (sku !== undefined && sku !== null && sku !== '') {
      updateData.sku = sku;
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        packageContents: {
          include: {
            product: true
          }
        }
      }
    });
    
    res.json({
      status: 'success',
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update product'
    });
  }
};

// Delete product
export const deleteProduct = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const existing = await prisma.product.findFirst({
      where: { id, tenantId }
    });
    
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    await prisma.product.delete({
      where: { id }
    });
    
    res.json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete product'
    });
  }
};

// ============================================
// INVENTORY MANAGEMENT
// ============================================

// Adjust inventory
export const adjustInventory = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { quantity, changeType, reason, reference, performedBy } = req.body;
    
    if (!quantity || !changeType) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity and change type are required'
      });
    }
    
    const product = await prisma.product.findFirst({
      where: { id, tenantId }
    });
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }
    
    if (!product.trackInventory) {
      return res.status(400).json({
        status: 'error',
        message: 'This product does not track inventory'
      });
    }
    
    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;
    
    if (newStock < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient inventory'
      });
    }
    
    // Update product stock
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { currentStock: newStock }
    });
    
    // Create inventory log
    await prisma.inventoryLog.create({
      data: {
        tenantId,
        productId: id,
        changeType,
        quantity,
        previousStock,
        newStock,
        reason,
        reference,
        performedBy
      }
    });
    
    res.json({
      status: 'success',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to adjust inventory'
    });
  }
};

// Get inventory logs
export const getInventoryLogs = async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const logs = await prisma.inventoryLog.findMany({
      where: {
        tenantId,
        productId: id
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json({
      status: 'success',
      data: logs
    });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inventory logs'
    });
  }
};

// Get low stock products
export const getLowStockProducts = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    // Get all products with inventory tracking
    const allProducts = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        trackInventory: true,
        lowStockAlert: { not: null }
      },
      include: {
        category: true
      },
      orderBy: { currentStock: 'asc' }
    });
    
    // Filter products where currentStock <= lowStockAlert
    const products = allProducts.filter(p => 
      p.lowStockAlert !== null && p.currentStock <= p.lowStockAlert
    );
    
    res.json({
      status: 'success',
      data: products
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch low stock products'
    });
  }
};

// ============================================
// PRODUCT CATEGORIES
// ============================================

// Get all categories
export const getAllCategories = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    
    const categories = await prisma.productCategory.findMany({
      where: {
        tenantId,
        isActive: true
      },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });
    
    res.json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch categories'
    });
  }
};

// Create category
export const createCategory = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant required',
        message: 'No tenant context found'
      });
    }
    const tenantId = req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
    const { name, description, displayOrder } = req.body;
    
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Name is required'
      });
    }
    
    const category = await prisma.productCategory.create({
      data: {
        tenantId,
        name,
        description,
        displayOrder: displayOrder || 0
      }
    });
    
    res.status(201).json({
      status: 'success',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create category'
    });
  }
};
