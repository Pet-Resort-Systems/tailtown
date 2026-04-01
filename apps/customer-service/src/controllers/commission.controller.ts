/**
 * Staff Commission Controller
 *
 * Handles CRUD operations for staff commission configurations
 * and commission calculation/reporting
 */

import { type Response, type NextFunction } from 'express';
import { CommissionType } from '@prisma/client';
import { assertStringRouteParam } from '@tailtown/shared';
import { AppError } from '../middleware/error.middleware.js';
import { type TenantRequest } from '../middleware/tenant.middleware.js';
import { prisma } from '../config/prisma.js';

/**
 * Get all commissions for a staff member
 */
export const getStaffCommissions = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const staffId = assertStringRouteParam(
      req.params.staffId,
      req.originalUrl,
      AppError.validationError,
      'Staff ID is required'
    );
    const tenantId = req.tenantId!;

    const commissions = await prisma.staffCommission.findMany({
      where: {
        tenantId,
        staffId,
      },
      include: {
        serviceCommissions: {
          select: {
            id: true,
            serviceId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: commissions.length,
      data: commissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single commission by ID
 */
export const getCommissionById = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Commission ID is required'
    );
    const tenantId = req.tenantId!;

    const commission = await prisma.staffCommission.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        serviceCommissions: {
          select: {
            id: true,
            serviceId: true,
          },
        },
      },
    });

    if (!commission) {
      return next(new AppError('Commission not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: commission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new commission for a staff member
 */
export const createCommission = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const {
      staffId,
      name,
      commissionType,
      commissionValue,
      serviceIds,
      notes,
    } = req.body;

    // Validate required fields
    if (!staffId || !name || !commissionType || commissionValue === undefined) {
      return next(
        new AppError(
          'Missing required fields: staffId, name, commissionType, commissionValue',
          400
        )
      );
    }

    // Validate commission type
    if (!['PERCENTAGE', 'FLAT_AMOUNT'].includes(commissionType)) {
      return next(
        new AppError(
          'Invalid commission type. Must be PERCENTAGE or FLAT_AMOUNT',
          400
        )
      );
    }

    // Validate commission value
    if (
      commissionType === 'PERCENTAGE' &&
      (commissionValue < 0 || commissionValue > 100)
    ) {
      return next(new AppError('Percentage must be between 0 and 100', 400));
    }

    if (commissionType === 'FLAT_AMOUNT' && commissionValue < 0) {
      return next(new AppError('Flat amount must be positive', 400));
    }

    // Verify staff exists
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, tenantId },
    });

    if (!staff) {
      return next(new AppError('Staff member not found', 404));
    }

    // Create commission with service links
    const commission = await prisma.staffCommission.create({
      data: {
        tenantId,
        staffId,
        name,
        commissionType: commissionType as CommissionType,
        commissionValue,
        notes,
        serviceCommissions:
          serviceIds && serviceIds.length > 0
            ? {
                create: serviceIds.map((serviceId: string) => ({
                  tenantId,
                  serviceId,
                })),
              }
            : undefined,
      },
      include: {
        serviceCommissions: {
          select: {
            id: true,
            serviceId: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: commission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a commission
 */
export const updateCommission = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Commission ID is required'
    );
    const tenantId = req.tenantId!;
    const {
      name,
      commissionType,
      commissionValue,
      serviceIds,
      isActive,
      notes,
    } = req.body;

    // Verify commission exists
    const existing = await prisma.staffCommission.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return next(new AppError('Commission not found', 404));
    }

    // Validate commission value if provided
    if (commissionType === 'PERCENTAGE' && commissionValue !== undefined) {
      if (commissionValue < 0 || commissionValue > 100) {
        return next(new AppError('Percentage must be between 0 and 100', 400));
      }
    }

    if (
      commissionType === 'FLAT_AMOUNT' &&
      commissionValue !== undefined &&
      commissionValue < 0
    ) {
      return next(new AppError('Flat amount must be positive', 400));
    }

    // Update commission
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (commissionType !== undefined)
      updateData.commissionType = commissionType;
    if (commissionValue !== undefined)
      updateData.commissionValue = commissionValue;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    // If serviceIds provided, update the service links
    if (serviceIds !== undefined) {
      // Delete existing service links
      await prisma.staffCommissionService.deleteMany({
        where: { commissionId: id },
      });

      // Create new service links
      if (serviceIds.length > 0) {
        await prisma.staffCommissionService.createMany({
          data: serviceIds.map((serviceId: string) => ({
            tenantId,
            commissionId: id,
            serviceId,
          })),
        });
      }
    }

    const commission = await prisma.staffCommission.update({
      where: { id },
      data: updateData,
      include: {
        serviceCommissions: {
          select: {
            id: true,
            serviceId: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: commission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a commission
 */
export const deleteCommission = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Commission ID is required'
    );
    const tenantId = req.tenantId!;

    const existing = await prisma.staffCommission.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return next(new AppError('Commission not found', 404));
    }

    await prisma.staffCommission.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Get all commissions for a tenant (admin view)
 */
export const getAllCommissions = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { isActive } = req.query;

    const where: any = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const commissions = await prisma.staffCommission.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        serviceCommissions: {
          select: {
            id: true,
            serviceId: true,
          },
        },
      },
      orderBy: [{ staff: { lastName: 'asc' } }, { createdAt: 'desc' }],
    });

    res.status(200).json({
      status: 'success',
      results: commissions.length,
      data: commissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate commission for a completed service
 * This can be called when a reservation is completed to calculate earnings
 */
export const calculateCommission = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId, serviceId, serviceAmount } = req.body;

    if (!staffId || !serviceId || serviceAmount === undefined) {
      return next(
        new AppError(
          'Missing required fields: staffId, serviceId, serviceAmount',
          400
        )
      );
    }

    // Find active commission for this staff member that applies to this service
    const commission = await prisma.staffCommission.findFirst({
      where: {
        tenantId,
        staffId,
        isActive: true,
        serviceCommissions: {
          some: {
            serviceId,
          },
        },
      },
    });

    if (!commission) {
      return res.status(200).json({
        status: 'success',
        data: {
          hasCommission: false,
          commissionAmount: 0,
        },
      });
    }

    // Calculate commission amount
    let commissionAmount = 0;
    if (commission.commissionType === 'PERCENTAGE') {
      commissionAmount = serviceAmount * (commission.commissionValue / 100);
    } else {
      commissionAmount = commission.commissionValue;
    }

    res.status(200).json({
      status: 'success',
      data: {
        hasCommission: true,
        commissionId: commission.id,
        commissionName: commission.name,
        commissionType: commission.commissionType,
        commissionValue: commission.commissionValue,
        serviceAmount,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get commission summary report for a staff member
 */
export const getCommissionReport = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const staffId = assertStringRouteParam(
      req.params.staffId,
      req.originalUrl,
      AppError.validationError,
      'Staff ID is required'
    );
    const { startDate, endDate } = req.query;

    // Get staff member's commissions
    const commissions = await prisma.staffCommission.findMany({
      where: {
        tenantId,
        staffId,
        isActive: true,
      },
      include: {
        serviceCommissions: {
          select: {
            serviceId: true,
          },
        },
      },
    });

    if (commissions.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          staffId,
          totalCommission: 0,
          commissionDetails: [],
          message: 'No active commissions found for this staff member',
        },
      });
    }

    // Get service IDs this staff member earns commission on
    const serviceIds = commissions.flatMap((c) =>
      c.serviceCommissions.map((sc) => sc.serviceId)
    );

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Get completed reservations for these services assigned to this staff member
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        staffAssignedId: staffId,
        serviceId: { in: serviceIds },
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 ? { endDate: dateFilter } : {}),
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        invoice: {
          select: {
            total: true,
          },
        },
      },
    });

    // Calculate commissions for each reservation
    let totalCommission = 0;
    const commissionDetails = reservations
      .map((reservation) => {
        const serviceAmount =
          reservation.invoice?.total || reservation.service.price;

        // Find applicable commission
        const applicableCommission = commissions.find((c) =>
          c.serviceCommissions.some(
            (sc) => sc.serviceId === reservation.serviceId
          )
        );

        if (!applicableCommission) {
          return null;
        }

        let commissionAmount = 0;
        if (applicableCommission.commissionType === 'PERCENTAGE') {
          commissionAmount =
            serviceAmount * (applicableCommission.commissionValue / 100);
        } else {
          commissionAmount = applicableCommission.commissionValue;
        }

        totalCommission += commissionAmount;

        return {
          reservationId: reservation.id,
          serviceName: reservation.service.name,
          serviceAmount,
          commissionName: applicableCommission.name,
          commissionType: applicableCommission.commissionType,
          commissionValue: applicableCommission.commissionValue,
          commissionAmount: Math.round(commissionAmount * 100) / 100,
          completedDate: reservation.endDate,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      status: 'success',
      data: {
        staffId,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        totalCommission: Math.round(totalCommission * 100) / 100,
        reservationCount: commissionDetails.length,
        commissionDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};
