/**
 * Customer Payment Method Controller
 * Handles saved cards on file for customers
 */

import { type Response, type NextFunction } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';
import { type TenantRequest } from '../middleware/tenant.middleware.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { env } from '../env.js';

/**
 * GET /api/customers/:customerId/payment-methods
 * Get all saved payment methods for a customer
 */
export const getCustomerPaymentMethods = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const tenantId = req.tenantId!;

    const paymentMethods = await prisma.customerPaymentMethod.findMany({
      where: {
        tenantId,
        customerId,
        isActive: true,
      },
      select: {
        id: true,
        cardBrand: true,
        lastFour: true,
        expiryMonth: true,
        expiryYear: true,
        cardholderName: true,
        isDefault: true,
        nickname: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    next(new AppError('Failed to fetch payment methods', 500));
  }
};

/**
 * POST /api/customers/:customerId/payment-methods
 * Save a new payment method (card on file)
 */
export const createCustomerPaymentMethod = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const tenantId = req.tenantId!;
    const {
      token,
      cardBrand,
      lastFour,
      expiryMonth,
      expiryYear,
      cardholderName,
      billingAddress,
      billingCity,
      billingState,
      billingZip,
      nickname,
      setAsDefault,
    } = req.body;

    // Validate required fields
    if (!token || !cardBrand || !lastFour || !expiryMonth || !expiryYear) {
      throw new AppError(
        'Missing required fields: token, cardBrand, lastFour, expiryMonth, expiryYear',
        400
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { tenantId, id: customerId },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Check if token already exists for this customer
    const existingMethod = await prisma.customerPaymentMethod.findFirst({
      where: { tenantId, customerId, token },
    });

    if (existingMethod) {
      throw new AppError('This card is already saved', 400);
    }

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      await prisma.customerPaymentMethod.updateMany({
        where: { tenantId, customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first card (make it default automatically)
    const existingCount = await prisma.customerPaymentMethod.count({
      where: { tenantId, customerId, isActive: true },
    });

    const paymentMethod = await prisma.customerPaymentMethod.create({
      data: {
        tenantId,
        customerId,
        token,
        cardBrand: cardBrand.toUpperCase(),
        lastFour,
        expiryMonth: parseInt(expiryMonth),
        expiryYear: parseInt(expiryYear),
        cardholderName,
        billingAddress,
        billingCity,
        billingState,
        billingZip,
        nickname,
        isDefault: setAsDefault || existingCount === 0,
      },
      select: {
        id: true,
        cardBrand: true,
        lastFour: true,
        expiryMonth: true,
        expiryYear: true,
        cardholderName: true,
        isDefault: true,
        nickname: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payment method saved successfully',
      data: paymentMethod,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error saving payment method:', error);
    next(new AppError('Failed to save payment method', 500));
  }
};

/**
 * PATCH /api/customers/:customerId/payment-methods/:methodId
 * Update a saved payment method (nickname, default status)
 */
export const updateCustomerPaymentMethod = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const methodId = assertStringRouteParam(
      req.params.methodId,
      req.originalUrl,
      AppError.validationError,
      'Payment method ID is required'
    );
    const tenantId = req.tenantId!;
    const { nickname, setAsDefault } = req.body;

    // Verify payment method exists
    const existing = await prisma.customerPaymentMethod.findFirst({
      where: { tenantId, customerId, id: methodId, isActive: true },
    });

    if (!existing) {
      throw new AppError('Payment method not found', 404);
    }

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      await prisma.customerPaymentMethod.updateMany({
        where: { tenantId, customerId, isDefault: true, id: { not: methodId } },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.customerPaymentMethod.update({
      where: { id: methodId },
      data: {
        nickname: nickname !== undefined ? nickname : existing.nickname,
        isDefault:
          setAsDefault !== undefined ? setAsDefault : existing.isDefault,
      },
      select: {
        id: true,
        cardBrand: true,
        lastFour: true,
        expiryMonth: true,
        expiryYear: true,
        cardholderName: true,
        isDefault: true,
        nickname: true,
        lastUsedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Payment method updated',
      data: paymentMethod,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error updating payment method:', error);
    next(new AppError('Failed to update payment method', 500));
  }
};

/**
 * DELETE /api/customers/:customerId/payment-methods/:methodId
 * Delete (soft-delete) a saved payment method
 */
export const deleteCustomerPaymentMethod = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const methodId = assertStringRouteParam(
      req.params.methodId,
      req.originalUrl,
      AppError.validationError,
      'Payment method ID is required'
    );
    const tenantId = req.tenantId!;

    // Verify payment method exists
    const existing = await prisma.customerPaymentMethod.findFirst({
      where: { tenantId, customerId, id: methodId, isActive: true },
    });

    if (!existing) {
      throw new AppError('Payment method not found', 404);
    }

    // Soft delete
    await prisma.customerPaymentMethod.update({
      where: { id: methodId },
      data: { isActive: false },
    });

    // If this was the default, set another as default
    if (existing.isDefault) {
      const nextDefault = await prisma.customerPaymentMethod.findFirst({
        where: { tenantId, customerId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (nextDefault) {
        await prisma.customerPaymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment method deleted',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error deleting payment method:', error);
    next(new AppError('Failed to delete payment method', 500));
  }
};

/**
 * POST /api/customers/:customerId/payment-methods/:methodId/charge
 * Charge a saved payment method
 */
export const chargeCustomerPaymentMethod = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const methodId = assertStringRouteParam(
      req.params.methodId,
      req.originalUrl,
      AppError.validationError,
      'Payment method ID is required'
    );
    const tenantId = req.tenantId!;
    const { amount, invoiceId, orderId, description } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError('Valid amount is required', 400);
    }

    // Get the saved payment method
    const paymentMethod = await prisma.customerPaymentMethod.findFirst({
      where: { tenantId, customerId, id: methodId, isActive: true },
    });

    if (!paymentMethod) {
      throw new AppError('Payment method not found', 404);
    }

    // Check if card is expired
    const now = new Date();
    const expiryDate = new Date(
      paymentMethod.expiryYear,
      paymentMethod.expiryMonth,
      0
    );
    if (expiryDate < now) {
      throw new AppError('This card has expired', 400);
    }

    // Call CardConnect to charge the token
    // Note: This requires the payment-service to be accessible
    const paymentServiceUrl =
      env.PAYMENT_SERVICE_URL || 'http://localhost:4005';

    const response = await fetch(
      `${paymentServiceUrl}/api/payments/charge-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          token: paymentMethod.token,
          amount,
          orderId,
          description,
          expiry: `${String(paymentMethod.expiryMonth).padStart(
            2,
            '0'
          )}${String(paymentMethod.expiryYear).slice(-2)}`,
        }),
      }
    );

    const result: {
      status?: string;
      message?: string;
      data?: { transactionId?: string };
    } = await response.json();

    if (!response.ok || result.status !== 'success') {
      throw new AppError(result.message || 'Payment failed', 402);
    }

    // Update last used timestamp
    await prisma.customerPaymentMethod.update({
      where: { id: methodId },
      data: { lastUsedAt: new Date() },
    });

    // If invoiceId provided, create payment record
    if (invoiceId) {
      await prisma.payment.create({
        data: {
          tenantId,
          invoiceId,
          customerId,
          amount,
          method: 'CREDIT_CARD',
          status: 'PAID',
          transactionId: result.data?.transactionId,
          gatewayResponse: result.data,
        },
      });
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        transactionId: result.data?.transactionId,
        amount,
        cardBrand: paymentMethod.cardBrand,
        lastFour: paymentMethod.lastFour,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error charging payment method:', error);
    next(new AppError('Failed to process payment', 500));
  }
};

/**
 * GET /api/customers/:customerId/payment-methods/default
 * Get the default payment method for a customer
 */
export const getDefaultPaymentMethod = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = assertStringRouteParam(
      req.params.customerId,
      req.originalUrl,
      AppError.validationError,
      'Customer ID is required'
    );
    const tenantId = req.tenantId!;

    const paymentMethod = await prisma.customerPaymentMethod.findFirst({
      where: {
        tenantId,
        customerId,
        isActive: true,
        isDefault: true,
      },
      select: {
        id: true,
        cardBrand: true,
        lastFour: true,
        expiryMonth: true,
        expiryYear: true,
        cardholderName: true,
        nickname: true,
      },
    });

    res.json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    console.error('Error fetching default payment method:', error);
    next(new AppError('Failed to fetch default payment method', 500));
  }
};
