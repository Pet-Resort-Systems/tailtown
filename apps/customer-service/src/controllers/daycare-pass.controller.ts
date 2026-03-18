import { Request, Response, NextFunction } from 'express';
import { DaycarePassStatus } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';

// Extended request with tenantId
interface TenantRequest extends Request {
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// ============================================
// PASS PACKAGE MANAGEMENT (Admin/Settings)
// ============================================

/**
 * GET /api/daycare-passes/packages
 * Get all pass packages for tenant (settings)
 */
export const getPassPackages = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const includeInactive = req.query.includeInactive === 'true';

    const packages = await prisma.daycarePassPackage.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      results: packages.length,
      data: packages,
    });
  } catch (error) {
    logger.error('Error fetching pass packages', {
      tenantId: req.tenantId,
      error,
    });
    next(error);
  }
};

/**
 * POST /api/daycare-passes/packages
 * Create a new pass package (admin setting)
 */
export const createPassPackage = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const {
      name,
      description,
      passCount,
      price,
      regularPricePerDay,
      discountPercent,
      validityDays,
      sortOrder,
    } = req.body;

    // Validation
    if (!name || !passCount || !price || !regularPricePerDay || !validityDays) {
      return next(
        new AppError(
          'Missing required fields: name, passCount, price, regularPricePerDay, validityDays',
          400
        )
      );
    }

    if (passCount < 1) {
      return next(new AppError('Pass count must be at least 1', 400));
    }

    if (validityDays < 1) {
      return next(new AppError('Validity days must be at least 1', 400));
    }

    const passPackage = await prisma.daycarePassPackage.create({
      data: {
        tenantId,
        name,
        description,
        passCount,
        price,
        regularPricePerDay,
        discountPercent: discountPercent || 0,
        validityDays,
        sortOrder: sortOrder || 0,
      },
    });

    logger.info('Pass package created', {
      tenantId,
      packageId: passPackage.id,
      name,
    });

    res.status(201).json({
      status: 'success',
      data: passPackage,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A package with this name already exists', 409));
    }
    logger.error('Error creating pass package', {
      tenantId: req.tenantId,
      error,
    });
    next(error);
  }
};

/**
 * PATCH /api/daycare-passes/packages/:id
 * Update a pass package
 */
export const updatePassPackage = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    // Verify package exists and belongs to tenant
    const existing = await prisma.daycarePassPackage.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return next(new AppError('Pass package not found', 404));
    }

    const {
      name,
      description,
      passCount,
      price,
      regularPricePerDay,
      discountPercent,
      validityDays,
      isActive,
      sortOrder,
    } = req.body;

    const passPackage = await prisma.daycarePassPackage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(passCount !== undefined && { passCount }),
        ...(price !== undefined && { price }),
        ...(regularPricePerDay !== undefined && { regularPricePerDay }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(validityDays !== undefined && { validityDays }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    logger.info('Pass package updated', { tenantId, packageId: id });

    res.status(200).json({
      status: 'success',
      data: passPackage,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A package with this name already exists', 409));
    }
    logger.error('Error updating pass package', {
      tenantId: req.tenantId,
      packageId: req.params.id,
      error,
    });
    next(error);
  }
};

/**
 * DELETE /api/daycare-passes/packages/:id
 * Soft delete (deactivate) a pass package
 */
export const deletePassPackage = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    // Verify package exists and belongs to tenant
    const existing = await prisma.daycarePassPackage.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return next(new AppError('Pass package not found', 404));
    }

    // Soft delete by deactivating
    await prisma.daycarePassPackage.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Pass package deactivated', { tenantId, packageId: id });

    res.status(200).json({
      status: 'success',
      message: 'Pass package deactivated',
    });
  } catch (error) {
    logger.error('Error deleting pass package', {
      tenantId: req.tenantId,
      packageId: req.params.id,
      error,
    });
    next(error);
  }
};

// ============================================
// CUSTOMER PASS MANAGEMENT
// ============================================

/**
 * GET /api/daycare-passes/customer/:customerId
 * Get all passes for a customer
 */
export const getCustomerPasses = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    const activeOnly = req.query.activeOnly !== 'false';

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const passes = await prisma.customerDaycarePass.findMany({
      where: {
        tenantId,
        customerId,
        ...(activeOnly ? { status: 'ACTIVE' } : {}),
      },
      include: {
        package: true,
        redemptions: {
          orderBy: { redeemedAt: 'desc' },
          take: 10, // Last 10 redemptions
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    // Calculate summary
    const summary = {
      totalPassesRemaining: passes
        .filter((p) => p.status === 'ACTIVE')
        .reduce((sum, p) => sum + p.passesRemaining, 0),
      activePasses: passes.filter((p) => p.status === 'ACTIVE').length,
      expiringSoon: passes.filter((p) => {
        if (p.status !== 'ACTIVE') return false;
        const daysUntilExpiry = Math.ceil(
          (p.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }).length,
    };

    res.status(200).json({
      status: 'success',
      summary,
      data: passes,
    });
  } catch (error) {
    logger.error('Error fetching customer passes', {
      tenantId: req.tenantId,
      customerId: req.params.customerId,
      error,
    });
    next(error);
  }
};

/**
 * POST /api/daycare-passes/purchase
 * Purchase a pass package for a customer
 */
export const purchasePass = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const { customerId, packageId, invoiceId, paymentId, notes } = req.body;
    const createdBy = req.user?.id;

    if (!customerId || !packageId) {
      return next(new AppError('Customer ID and Package ID are required', 400));
    }

    // Get the package
    const passPackage = await prisma.daycarePassPackage.findFirst({
      where: { id: packageId, tenantId, isActive: true },
    });

    if (!passPackage) {
      return next(new AppError('Pass package not found or inactive', 404));
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + passPackage.validityDays);

    // Create the customer pass
    const customerPass = await prisma.customerDaycarePass.create({
      data: {
        tenantId,
        customerId,
        packageId,
        passesPurchased: passPackage.passCount,
        passesRemaining: passPackage.passCount,
        passesUsed: 0,
        purchasePrice: passPackage.price,
        pricePerPass: passPackage.price / passPackage.passCount,
        expiresAt,
        invoiceId,
        paymentId,
        notes,
        createdBy,
      },
      include: {
        package: true,
      },
    });

    logger.info('Pass purchased', {
      tenantId,
      customerId,
      passId: customerPass.id,
      packageName: passPackage.name,
      passCount: passPackage.passCount,
    });

    res.status(201).json({
      status: 'success',
      data: customerPass,
    });
  } catch (error) {
    logger.error('Error purchasing pass', { tenantId: req.tenantId, error });
    next(error);
  }
};

/**
 * POST /api/daycare-passes/:passId/redeem
 * Redeem one pass from a customer's balance
 */
export const redeemPass = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { passId } = req.params;
    const { petId, reservationId, checkInId, notes } = req.body;
    const redeemedBy = req.user?.id;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    if (!petId) {
      return next(new AppError('Pet ID is required', 400));
    }

    // Get the pass with transaction lock
    const result = await prisma.$transaction(async (tx) => {
      const customerPass = await tx.customerDaycarePass.findFirst({
        where: { id: passId, tenantId },
      });

      if (!customerPass) {
        throw new AppError('Pass not found', 404);
      }

      if (customerPass.status !== 'ACTIVE') {
        throw new AppError(`Pass is ${customerPass.status.toLowerCase()}`, 400);
      }

      if (customerPass.passesRemaining < 1) {
        throw new AppError('No passes remaining', 400);
      }

      if (customerPass.expiresAt < new Date()) {
        // Auto-expire the pass
        await tx.customerDaycarePass.update({
          where: { id: passId },
          data: { status: 'EXPIRED' },
        });
        throw new AppError('Pass has expired', 400);
      }

      const passesBeforeUse = customerPass.passesRemaining;
      const passesAfterUse = passesBeforeUse - 1;

      // Create redemption record
      const redemption = await tx.daycarePassRedemption.create({
        data: {
          tenantId,
          customerPassId: passId,
          petId,
          reservationId,
          checkInId,
          passesBeforeUse,
          passesAfterUse,
          redeemedBy,
          notes,
        },
      });

      // Update pass balance
      const updatedPass = await tx.customerDaycarePass.update({
        where: { id: passId },
        data: {
          passesRemaining: passesAfterUse,
          passesUsed: customerPass.passesUsed + 1,
          status: passesAfterUse === 0 ? 'EXHAUSTED' : 'ACTIVE',
        },
        include: {
          package: true,
        },
      });

      return { pass: updatedPass, redemption };
    });

    logger.info('Pass redeemed', {
      tenantId,
      passId,
      petId,
      remaining: result.pass.passesRemaining,
    });

    res.status(200).json({
      status: 'success',
      message: `Pass redeemed. ${result.pass.passesRemaining} passes remaining.`,
      data: {
        pass: result.pass,
        redemption: result.redemption,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error('Error redeeming pass', {
      tenantId: req.tenantId,
      passId: req.params.passId,
      error,
    });
    next(error);
  }
};

/**
 * POST /api/daycare-passes/redemptions/:redemptionId/reverse
 * Reverse a redemption (refund the pass back)
 */
export const reverseRedemption = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { redemptionId } = req.params;
    const { reason } = req.body;
    const reversedBy = req.user?.id;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    if (!reason) {
      return next(new AppError('Reversal reason is required', 400));
    }

    const result = await prisma.$transaction(async (tx) => {
      const redemption = await tx.daycarePassRedemption.findFirst({
        where: { id: redemptionId, tenantId },
        include: { customerPass: true },
      });

      if (!redemption) {
        throw new AppError('Redemption not found', 404);
      }

      if (redemption.isReversed) {
        throw new AppError('Redemption already reversed', 400);
      }

      // Mark redemption as reversed
      const updatedRedemption = await tx.daycarePassRedemption.update({
        where: { id: redemptionId },
        data: {
          isReversed: true,
          reversedAt: new Date(),
          reversedBy,
          reversalReason: reason,
        },
      });

      // Restore pass balance
      const updatedPass = await tx.customerDaycarePass.update({
        where: { id: redemption.customerPassId },
        data: {
          passesRemaining: redemption.customerPass.passesRemaining + 1,
          passesUsed: Math.max(0, redemption.customerPass.passesUsed - 1),
          status: 'ACTIVE', // Reactivate if it was exhausted
        },
        include: { package: true },
      });

      return { pass: updatedPass, redemption: updatedRedemption };
    });

    logger.info('Redemption reversed', {
      tenantId,
      redemptionId,
      passId: result.pass.id,
      reason,
    });

    res.status(200).json({
      status: 'success',
      message: 'Redemption reversed. Pass restored.',
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error('Error reversing redemption', {
      tenantId: req.tenantId,
      redemptionId: req.params.redemptionId,
      error,
    });
    next(error);
  }
};

/**
 * POST /api/daycare-passes/auto-redeem
 * Automatically select and redeem the best available pass for a customer
 * (Uses pass expiring soonest first)
 */
export const autoRedeemPass = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, petId, reservationId, checkInId, notes } = req.body;
    const redeemedBy = req.user?.id;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    if (!customerId || !petId) {
      return next(new AppError('Customer ID and Pet ID are required', 400));
    }

    // Find the best pass (expiring soonest with remaining balance)
    const bestPass = await prisma.customerDaycarePass.findFirst({
      where: {
        tenantId,
        customerId,
        status: 'ACTIVE',
        passesRemaining: { gt: 0 },
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });

    if (!bestPass) {
      return res.status(200).json({
        status: 'success',
        redeemed: false,
        message: 'No available passes for this customer',
        data: null,
      });
    }

    // Redeem the pass
    const result = await prisma.$transaction(async (tx) => {
      const passesBeforeUse = bestPass.passesRemaining;
      const passesAfterUse = passesBeforeUse - 1;

      // Create redemption record
      const redemption = await tx.daycarePassRedemption.create({
        data: {
          tenantId,
          customerPassId: bestPass.id,
          petId,
          reservationId,
          checkInId,
          passesBeforeUse,
          passesAfterUse,
          redeemedBy,
          notes,
        },
      });

      // Update pass balance
      const updatedPass = await tx.customerDaycarePass.update({
        where: { id: bestPass.id },
        data: {
          passesRemaining: passesAfterUse,
          passesUsed: bestPass.passesUsed + 1,
          status: passesAfterUse === 0 ? 'EXHAUSTED' : 'ACTIVE',
        },
        include: {
          package: true,
        },
      });

      return { pass: updatedPass, redemption };
    });

    logger.info('Pass auto-redeemed', {
      tenantId,
      customerId,
      passId: bestPass.id,
      petId,
      remaining: result.pass.passesRemaining,
    });

    res.status(200).json({
      status: 'success',
      redeemed: true,
      message: `Pass redeemed. ${result.pass.passesRemaining} passes remaining.`,
      data: {
        pass: result.pass,
        redemption: result.redemption,
      },
    });
  } catch (error) {
    logger.error('Error auto-redeeming pass', {
      tenantId: req.tenantId,
      customerId: req.body.customerId,
      error,
    });
    next(error);
  }
};

/**
 * GET /api/daycare-passes/check/:customerId
 * Quick check if customer has available passes (for check-in flow)
 */
export const checkAvailablePasses = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    if (!tenantId) {
      return next(new AppError('Tenant ID is required', 400));
    }

    const activePasses = await prisma.customerDaycarePass.findMany({
      where: {
        tenantId,
        customerId,
        status: 'ACTIVE',
        passesRemaining: { gt: 0 },
        expiresAt: { gt: new Date() },
      },
      include: {
        package: {
          select: { name: true },
        },
      },
      orderBy: { expiresAt: 'asc' }, // Use passes expiring soonest first
    });

    const totalRemaining = activePasses.reduce(
      (sum, p) => sum + p.passesRemaining,
      0
    );

    res.status(200).json({
      status: 'success',
      hasAvailablePasses: totalRemaining > 0,
      totalPassesRemaining: totalRemaining,
      passes: activePasses.map((p) => ({
        id: p.id,
        packageName: p.package.name,
        remaining: p.passesRemaining,
        expiresAt: p.expiresAt,
      })),
    });
  } catch (error) {
    logger.error('Error checking available passes', {
      tenantId: req.tenantId,
      customerId: req.params.customerId,
      error,
    });
    next(error);
  }
};
