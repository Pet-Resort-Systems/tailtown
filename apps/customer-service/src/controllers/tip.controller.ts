import { type Request, type Response, type NextFunction } from 'express';
import {
  TipType,
  TipCollectionMethod,
} from '../generated/prisma/client.js';
import { assertStringRouteParam } from '@tailtown/shared';
import { AppError } from '../middleware/error.middleware.js';
import { prisma } from '../config/prisma.js';

/**
 * Create a new tip
 */
export const createTip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const {
      type,
      amount,
      percentage,
      collectionMethod,
      customerId,
      reservationId,
      invoiceId,
      groomerId,
      notes,
      recordedBy,
    } = req.body;

    // Validate required fields
    if (!type || !amount || !collectionMethod || !customerId) {
      return next(
        new AppError(
          'Type, amount, collection method, and customer ID are required',
          400
        )
      );
    }

    // Validate tip type
    if (!Object.values(TipType).includes(type)) {
      return next(
        new AppError('Invalid tip type. Must be GROOMER or GENERAL', 400)
      );
    }

    // Validate collection method
    if (!Object.values(TipCollectionMethod).includes(collectionMethod)) {
      return next(
        new AppError(
          'Invalid collection method. Must be ONLINE, TERMINAL, or CASH',
          400
        )
      );
    }

    // If GROOMER tip, groomerId is required
    if (type === TipType.GROOMER && !groomerId) {
      return next(new AppError('Groomer ID is required for groomer tips', 400));
    }

    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Validate groomer exists if provided
    if (groomerId) {
      const groomer = await prisma.staff.findFirst({
        where: { id: groomerId, tenantId },
      });
      if (!groomer) {
        return next(new AppError('Groomer not found', 404));
      }
    }

    const tip = await prisma.tip.create({
      data: {
        tenantId,
        type,
        amount,
        percentage: percentage || null,
        collectionMethod,
        customerId,
        reservationId: reservationId || null,
        invoiceId: invoiceId || null,
        groomerId: groomerId || null,
        notes: notes || null,
        recordedBy: recordedBy || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        groomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: tip,
    });
  } catch (error) {
    console.error('Error creating tip:', error);
    return next(new AppError('Error creating tip', 500));
  }
};

/**
 * Get all tips with optional filters
 */
export const getTips = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const {
      type,
      groomerId,
      customerId,
      reservationId,
      invoiceId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { tenantId };

    if (type) where.type = type;
    if (groomerId) where.groomerId = groomerId;
    if (customerId) where.customerId = customerId;
    if (reservationId) where.reservationId = reservationId;
    if (invoiceId) where.invoiceId = invoiceId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [tips, total] = await Promise.all([
      prisma.tip.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          groomer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.tip.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      results: tips.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: tips,
    });
  } catch (error) {
    console.error('Error fetching tips:', error);
    return next(new AppError('Error fetching tips', 500));
  }
};

/**
 * Get a single tip by ID
 */
export const getTipById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Tip ID is required'
    );

    const tip = await prisma.tip.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        groomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!tip) {
      return next(new AppError('Tip not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: tip,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error fetching tip:', error);
    return next(new AppError('Error fetching tip', 500));
  }
};

/**
 * Update a tip
 */
export const updateTip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Tip ID is required'
    );
    const { amount, percentage, notes } = req.body;

    // Check tip exists
    const existingTip = await prisma.tip.findFirst({
      where: { id, tenantId },
    });

    if (!existingTip) {
      return next(new AppError('Tip not found', 404));
    }

    const tip = await prisma.tip.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(percentage !== undefined && { percentage }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        groomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: tip,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error updating tip:', error);
    return next(new AppError('Error updating tip', 500));
  }
};

/**
 * Delete a tip
 */
export const deleteTip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Tip ID is required'
    );

    // Check tip exists
    const existingTip = await prisma.tip.findFirst({
      where: { id, tenantId },
    });

    if (!existingTip) {
      return next(new AppError('Tip not found', 404));
    }

    await prisma.tip.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error deleting tip:', error);
    return next(new AppError('Error deleting tip', 500));
  }
};

/**
 * Get tips summary for a groomer (for payroll/reporting)
 */
export const getGroomerTipsSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const groomerId = assertStringRouteParam(
      req.params.groomerId,
      req.originalUrl,
      AppError.validationError,
      'Groomer ID is required'
    );
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Get groomer info
    const groomer = await prisma.staff.findFirst({
      where: { id: groomerId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!groomer) {
      return next(new AppError('Groomer not found', 404));
    }

    // Get all tips for this groomer
    const tips = await prisma.tip.findMany({
      where: {
        tenantId,
        groomerId,
        type: TipType.GROOMER,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const totalAmount = tips.reduce((sum, tip) => sum + Number(tip.amount), 0);
    const tipCount = tips.length;
    const averageTip = tipCount > 0 ? totalAmount / tipCount : 0;

    // Group by collection method
    const byCollectionMethod = tips.reduce((acc: any, tip) => {
      const method = tip.collectionMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count++;
      acc[method].total += Number(tip.amount);
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: {
        groomer,
        summary: {
          totalAmount,
          tipCount,
          averageTip: Math.round(averageTip * 100) / 100,
          byCollectionMethod,
        },
        tips,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('Error fetching groomer tips summary:', error);
    return next(new AppError('Error fetching groomer tips summary', 500));
  }
};

/**
 * Get general tip pool summary (for team distribution)
 */
export const getGeneralTipPoolSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Get all general tips
    const tips = await prisma.tip.findMany({
      where: {
        tenantId,
        type: TipType.GENERAL,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const totalAmount = tips.reduce((sum, tip) => sum + Number(tip.amount), 0);
    const tipCount = tips.length;
    const averageTip = tipCount > 0 ? totalAmount / tipCount : 0;

    // Group by collection method
    const byCollectionMethod = tips.reduce((acc: any, tip) => {
      const method = tip.collectionMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count++;
      acc[method].total += Number(tip.amount);
      return acc;
    }, {});

    // Group by day for charting
    const byDay = tips.reduce((acc: any, tip) => {
      const day = tip.createdAt.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { count: 0, total: 0 };
      }
      acc[day].count++;
      acc[day].total += Number(tip.amount);
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalAmount,
          tipCount,
          averageTip: Math.round(averageTip * 100) / 100,
          byCollectionMethod,
          byDay,
        },
        tips,
      },
    });
  } catch (error) {
    console.error('Error fetching general tip pool summary:', error);
    return next(new AppError('Error fetching general tip pool summary', 500));
  }
};

/**
 * Get all groomers' tips summary (for management overview)
 */
export const getAllGroomersTipsSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Get all groomers with their tips
    const groomers = await prisma.staff.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['groomer', 'Groomer', 'GROOMER'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Get tips for all groomers
    const groomerTips = await prisma.tip.groupBy({
      by: ['groomerId'],
      where: {
        tenantId,
        type: TipType.GROOMER,
        groomerId: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Combine groomer info with tips
    const groomerSummaries = groomers.map((groomer) => {
      const tipData = groomerTips.find((t) => t.groomerId === groomer.id);
      return {
        groomer,
        totalTips: tipData?._sum?.amount ? Number(tipData._sum.amount) : 0,
        tipCount: tipData?._count?.id || 0,
      };
    });

    // Sort by total tips descending
    groomerSummaries.sort((a, b) => b.totalTips - a.totalTips);

    // Calculate totals
    const grandTotal = groomerSummaries.reduce(
      (sum, g) => sum + g.totalTips,
      0
    );
    const totalTipCount = groomerSummaries.reduce(
      (sum, g) => sum + g.tipCount,
      0
    );

    res.status(200).json({
      status: 'success',
      data: {
        groomers: groomerSummaries,
        totals: {
          grandTotal,
          totalTipCount,
          groomerCount: groomers.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching all groomers tips summary:', error);
    return next(new AppError('Error fetching all groomers tips summary', 500));
  }
};
