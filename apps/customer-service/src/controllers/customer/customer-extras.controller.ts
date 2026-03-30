/**
 * Customer Extras Controller
 *
 * Handles additional customer operations:
 * - getCustomerDocuments
 * - uploadCustomerDocument
 * - getCustomerNotificationPreferences
 * - updateCustomerNotificationPreferences
 * - getCustomerInvoices
 * - getCustomerPayments
 */

import { type Response, type NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware.js';
import { type TenantRequest } from '../../middleware/tenant.middleware.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/prisma.js';

/**
 * Get customer documents
 */
export const getCustomerDocuments = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Document model is not in the current schema
    res.status(200).json({
      status: 'success',
      message: 'Document functionality is not available in the current schema',
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a customer document
 */
export const uploadCustomerDocument = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Document model is not in the current schema
    res.status(200).json({
      status: 'success',
      message:
        'Document upload functionality is not available in the current schema',
      data: {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        fileSize: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer notification preferences
 */
export const getCustomerNotificationPreferences = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Notification preferences not in current schema
    res.status(200).json({
      status: 'success',
      message:
        'Notification preferences are not available in the current schema',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer notification preferences
 */
export const updateCustomerNotificationPreferences = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        message:
          'Notification preferences are not available in the current schema',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer invoices
 */
export const getCustomerInvoices = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const customerExists = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customerExists) {
      return next(new AppError('Customer not found', 404));
    }

    let invoices: any[] = [];
    let total = 0;

    try {
      invoices = await prisma.$queryRaw`
        SELECT * FROM "Invoice" 
        WHERE "customerId" = ${id} 
        ORDER BY "issueDate" DESC 
        LIMIT ${limit} 
        OFFSET ${skip}
      `;

      const totalResult: any[] = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Invoice" 
        WHERE "customerId" = ${id}
      `;
      total = totalResult[0]?.count ? Number(totalResult[0].count) : 0;
    } catch (error) {
      logger.warn('Invoice table may not exist in the database', {
        tenantId: req.tenantId,
        customerId: id,
      });
    }

    res.status(200).json({
      status: 'success',
      results: invoices.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer payments
 */
export const getCustomerPayments = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const customerExists = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customerExists) {
      return next(new AppError('Customer not found', 404));
    }

    // Payment model is not in the current schema
    res.status(200).json({
      status: 'success',
      results: 0,
      totalPages: 0,
      currentPage: page,
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer's permanent discount coupon
 */
export const getCustomerPermanentCoupon = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        permanentCoupon: true,
      },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: customer.permanentCoupon,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set customer's permanent discount coupon
 */
export const setCustomerPermanentCoupon = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { couponId } = req.body;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // If couponId provided, verify coupon exists and is active
    if (couponId) {
      const coupon = await prisma.coupon.findUnique({
        where: { id: couponId },
      });

      if (!coupon) {
        return next(new AppError('Coupon not found', 404));
      }

      if (coupon.status !== 'ACTIVE') {
        return next(new AppError('Coupon is not active', 400));
      }
    }

    // Update customer with permanent coupon
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        permanentCouponId: couponId || null,
      },
      include: {
        permanentCoupon: true,
      },
    });

    logger.info(
      `Set permanent coupon for customer ${id}: ${couponId || 'removed'}`
    );

    res.status(200).json({
      status: 'success',
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove customer's permanent discount coupon
 */
export const removeCustomerPermanentCoupon = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        permanentCouponId: null,
      },
    });

    logger.info(`Removed permanent coupon from customer ${id}`);

    res.status(200).json({
      status: 'success',
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};
