import { type Request, type Response, type NextFunction } from 'express';
import { CouponType, CouponStatus } from '@prisma/client';
import { assertStringRouteParam } from '@tailtown/shared';
import { AppError } from '../middleware/error.middleware.js';
import { prisma } from '../config/prisma.js';

// Get all coupons
export const getAllCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as CouponStatus | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const coupons = await prisma.coupon.findMany({
      where,
      skip,
      take: limit,
      include: {
        usages: {
          select: {
            id: true,
            customerId: true,
            usedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.coupon.count({ where });

    res.status(200).json({
      status: 'success',
      results: coupons.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

// Get coupon by ID
export const getCouponById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Coupon ID is required'
    );

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          select: {
            id: true,
            customerId: true,
            reservationId: true,
            discountAmount: true,
            usedAt: true,
          },
          orderBy: { usedAt: 'desc' },
        },
      },
    });

    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// Get coupon by code
export const getCouponByCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const code = assertStringRouteParam(
      req.params.code,
      req.originalUrl,
      AppError.validationError,
      'Coupon code is required'
    );

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
      include: {
        usages: true,
      },
    });

    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// Create coupon
export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      code,
      description,
      type,
      discountValue,
      minimumPurchase,
      serviceIds,
      firstTimeCustomersOnly,
      validFrom,
      validUntil,
      maxTotalUses,
      maxUsesPerCustomer,
      isReferralCoupon,
      referralCustomerId,
      notes,
      createdBy,
    } = req.body;

    // Validate required fields
    if (!code || !description || !type || discountValue === undefined) {
      return next(new AppError('Missing required fields', 400));
    }

    // Validate discount value
    if (type === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      return next(
        new AppError('Percentage discount must be between 0 and 100', 400)
      );
    }

    if (type === 'FIXED_AMOUNT' && discountValue <= 0) {
      return next(
        new AppError('Fixed amount discount must be greater than 0', 400)
      );
    }

    // Check if code already exists
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });

    if (existingCoupon) {
      return next(new AppError('Coupon code already exists', 400));
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        type,
        discountValue,
        minimumPurchase,
        serviceIds: serviceIds ? JSON.stringify(serviceIds) : null,
        firstTimeCustomersOnly: firstTimeCustomersOnly || false,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        maxTotalUses,
        maxUsesPerCustomer: maxUsesPerCustomer || 1,
        isReferralCoupon: isReferralCoupon || false,
        referralCustomerId,
        notes,
        createdBy,
      },
    });

    res.status(201).json({
      status: 'success',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// Update coupon
export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Coupon ID is required'
    );
    const {
      description,
      discountValue,
      minimumPurchase,
      serviceIds,
      firstTimeCustomersOnly,
      validFrom,
      validUntil,
      maxTotalUses,
      maxUsesPerCustomer,
      status,
      notes,
    } = req.body;

    const coupon = await prisma.coupon.findUnique({ where: { id } });

    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }

    // Validate discount value if provided
    if (discountValue !== undefined) {
      if (
        coupon.type === 'PERCENTAGE' &&
        (discountValue < 0 || discountValue > 100)
      ) {
        return next(
          new AppError('Percentage discount must be between 0 and 100', 400)
        );
      }
      if (coupon.type === 'FIXED_AMOUNT' && discountValue <= 0) {
        return next(
          new AppError('Fixed amount discount must be greater than 0', 400)
        );
      }
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: {
        description,
        discountValue,
        minimumPurchase,
        serviceIds: serviceIds ? JSON.stringify(serviceIds) : undefined,
        firstTimeCustomersOnly,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        maxTotalUses,
        maxUsesPerCustomer,
        status,
        notes,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedCoupon,
    });
  } catch (error) {
    next(error);
  }
};

// Delete coupon
export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Coupon ID is required'
    );

    const coupon = await prisma.coupon.findUnique({ where: { id } });

    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }

    await prisma.coupon.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Validate coupon
export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, customerId, subtotal, serviceIds } = req.body;

    if (!code || !customerId || subtotal === undefined) {
      return next(new AppError('Missing required fields', 400));
    }

    // Find coupon
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
      include: {
        usages: {
          where: {
            customerId,
          },
        },
      },
    });

    if (!coupon) {
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          error: 'Coupon not found',
        },
      });
    }

    // Check status
    if (coupon.status !== 'ACTIVE') {
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          error: 'Coupon is not active',
        },
      });
    }

    // Check dates
    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          error: 'Coupon is not valid at this time',
        },
      });
    }

    // Check total uses
    if (coupon.maxTotalUses && coupon.currentUses >= coupon.maxTotalUses) {
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          error: 'Coupon has reached maximum uses',
        },
      });
    }

    // Check customer uses
    if (coupon.usages.length >= coupon.maxUsesPerCustomer) {
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          error:
            'You have already used this coupon the maximum number of times',
        },
      });
    }

    // Check minimum purchase
    if (coupon.minimumPurchase && subtotal < coupon.minimumPurchase) {
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          error: `Minimum purchase of $${coupon.minimumPurchase} required`,
        },
      });
    }

    // Check service restrictions
    if (coupon.serviceIds) {
      const allowedServiceIds = JSON.parse(coupon.serviceIds);
      if (serviceIds && serviceIds.length > 0) {
        const hasValidService = serviceIds.some((id: string) =>
          allowedServiceIds.includes(id)
        );
        if (!hasValidService) {
          return res.status(200).json({
            status: 'success',
            data: {
              isValid: false,
              error: 'Coupon is not valid for selected services',
            },
          });
        }
      }
    }

    // Check first-time customer
    if (coupon.firstTimeCustomersOnly) {
      // Check if customer has any previous reservations
      // This would need to query the reservations table
      // For now, we'll skip this check
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = subtotal * (coupon.discountValue / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    const finalPrice = Math.max(0, subtotal - discountAmount);

    res.status(200).json({
      status: 'success',
      data: {
        isValid: true,
        discountAmount,
        finalPrice,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          type: coupon.type,
          discountValue: coupon.discountValue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Apply coupon (record usage)
export const applyCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { couponId, customerId, reservationId, discountAmount } = req.body;

    if (
      !couponId ||
      !customerId ||
      !reservationId ||
      discountAmount === undefined
    ) {
      return next(new AppError('Missing required fields', 400));
    }

    // Create usage record and increment currentUses
    const [usage, updatedCoupon] = await prisma.$transaction([
      prisma.couponUsage.create({
        data: {
          couponId,
          customerId,
          reservationId,
          discountAmount,
        },
      }),
      prisma.coupon.update({
        where: { id: couponId },
        data: {
          currentUses: {
            increment: 1,
          },
        },
      }),
    ]);

    // Check if coupon should be marked as depleted
    if (
      updatedCoupon.maxTotalUses &&
      updatedCoupon.currentUses >= updatedCoupon.maxTotalUses
    ) {
      await prisma.coupon.update({
        where: { id: couponId },
        data: { status: 'DEPLETED' },
      });
    }

    res.status(201).json({
      status: 'success',
      data: usage,
    });
  } catch (error) {
    next(error);
  }
};

// Get coupon usage stats
export const getCouponStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Coupon ID is required'
    );

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          select: {
            discountAmount: true,
            usedAt: true,
          },
        },
      },
    });

    if (!coupon) {
      return next(new AppError('Coupon not found', 404));
    }

    const totalDiscountGiven = coupon.usages.reduce(
      (sum, usage) => sum + usage.discountAmount,
      0
    );
    const averageDiscountPerUse =
      coupon.usages.length > 0 ? totalDiscountGiven / coupon.usages.length : 0;

    res.status(200).json({
      status: 'success',
      data: {
        couponId: coupon.id,
        code: coupon.code,
        totalUses: coupon.currentUses,
        maxUses: coupon.maxTotalUses,
        remainingUses: coupon.maxTotalUses
          ? coupon.maxTotalUses - coupon.currentUses
          : null,
        totalDiscountGiven,
        averageDiscountPerUse,
        status: coupon.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bulk create coupons
export const bulkCreateCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      prefix,
      count,
      type,
      discountValue,
      description,
      validFrom,
      validUntil,
      maxUsesPerCustomer,
      minimumPurchase,
    } = req.body;

    if (!prefix || !count || !type || discountValue === undefined) {
      return next(new AppError('Missing required fields', 400));
    }

    if (count > 1000) {
      return next(
        new AppError('Cannot create more than 1000 coupons at once', 400)
      );
    }

    // Generate unique codes
    const coupons = [];
    for (let i = 0; i < count; i++) {
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      const code = `${prefix}-${randomSuffix}`;

      coupons.push({
        code,
        description: description || `${prefix} Coupon`,
        type,
        discountValue,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        maxUsesPerCustomer: maxUsesPerCustomer || 1,
        minimumPurchase,
      });
    }

    // Create all coupons
    const created = await prisma.coupon.createMany({
      data: coupons,
    });

    res.status(201).json({
      status: 'success',
      data: {
        created: created.count,
        coupons: coupons.map((c) => c.code),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get active coupons
export const getActiveCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        status: 'ACTIVE',
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: coupons.length,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

// Update coupon status
export const updateCouponStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Coupon ID is required'
    );
    const { status } = req.body;

    if (!status) {
      return next(new AppError('Status is required', 400));
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({
      status: 'success',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// Get customer's permanent coupon for checkout auto-apply
export const getCustomerPermanentCouponForCheckout = async (
  req: Request,
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

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        permanentCoupon: true,
      },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    if (!customer.permanentCoupon) {
      return res.status(200).json({
        status: 'success',
        data: null,
      });
    }

    const coupon = customer.permanentCoupon;

    // Check if coupon is still valid
    const now = new Date();
    const isValid =
      coupon.status === 'ACTIVE' &&
      now >= new Date(coupon.validFrom) &&
      now <= new Date(coupon.validUntil);

    if (!isValid) {
      return res.status(200).json({
        status: 'success',
        data: null,
        message: 'Permanent coupon is no longer valid',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        discountValue: coupon.discountValue,
        minimumPurchase: coupon.minimumPurchase,
      },
    });
  } catch (error) {
    next(error);
  }
};
