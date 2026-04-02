/**
 * Reservation CRUD Controller
 *
 * Handles create, update, and delete operations:
 * - createReservation
 * - updateReservation
 * - deleteReservation
 */

import { type Response, type NextFunction } from 'express';
import { ReservationStatus } from '../../generated/prisma/client.js';
import { assertStringRouteParam } from '@tailtown/shared';
import { type TenantRequest } from '../../middleware/tenant.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { logger } from '../../utils/logger.js';
import {
  tenantAuditLog,
  AuditAction,
  AuditSeverity,
} from '../../services/tenant-audit-log.service.js';
import { generateOrderNumber } from './utils/order-number.js';
import { prisma } from '../../config/prisma.js';

// Valid resource types
const VALID_RESOURCE_TYPES = [
  'JUNIOR_KENNEL',
  'QUEEN_KENNEL',
  'KING_KENNEL',
  'VIP_ROOM',
  'CAT_CONDO',
  'DAY_CAMP_FULL',
  'DAY_CAMP_HALF',
];

// Legacy suite types for backward compatibility
const LEGACY_SUITE_TYPES = [
  'VIP_SUITE',
  'STANDARD_PLUS_SUITE',
  'STANDARD_SUITE',
];

const ALL_VALID_TYPES = [...VALID_RESOURCE_TYPES, ...LEGACY_SUITE_TYPES];

/**
 * Check if a suite is available for the given dates
 */
async function isSuiteAvailable(
  suiteId: string,
  startDate: Date,
  endDate: Date,
  excludeReservationId?: string
): Promise<boolean> {
  const reservationStartDate = new Date(startDate);
  const reservationEndDate = new Date(endDate);

  const where: any = {
    resourceId: suiteId,
    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
    OR: [
      {
        startDate: { lte: reservationEndDate },
        endDate: { gte: reservationStartDate },
      },
    ],
  };

  if (excludeReservationId) {
    where.NOT = { id: excludeReservationId };
  }

  const overlapping = await prisma.reservation.count({ where });
  return overlapping === 0;
}

/**
 * Create a new reservation
 */
export const createReservation = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      customerId,
      petId,
      serviceId,
      startDate,
      endDate,
      suiteType,
      resourceId,
      status = 'PENDING',
      notes = '',
    } = req.body;

    // Validate required fields
    if (!serviceId) {
      return next(new AppError('Service ID is required', 400));
    }

    // Check if the service requires a suite type
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    const serviceCategory = service ? (service as any).serviceCategory : null;
    const requiresSuiteType =
      serviceCategory === 'DAYCARE' || serviceCategory === 'BOARDING';

    // Validate and normalize suite type
    let finalSuiteType = suiteType;
    if (requiresSuiteType) {
      if (!suiteType) {
        finalSuiteType = 'JUNIOR_KENNEL'; // Default
      } else if (!ALL_VALID_TYPES.includes(suiteType)) {
        logger.warn(`Invalid suiteType provided: "${suiteType}"`);
        finalSuiteType = 'JUNIOR_KENNEL';
      }
    } else {
      finalSuiteType = null;
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Validate pet exists and belongs to customer
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet) {
      return next(new AppError('Pet not found', 404));
    }

    if (pet.customerId !== customerId) {
      return next(
        new AppError('The pet does not belong to this customer', 400)
      );
    }

    let assignedResourceId = resourceId;

    // Handle resource assignment for services that require a suite
    if (requiresSuiteType && finalSuiteType) {
      if (resourceId) {
        // Validate provided resource
        const suite = await prisma.resource.findUnique({
          where: { id: resourceId },
        });

        if (!suite) {
          return next(
            new AppError(
              `Selected suite/kennel not found with ID: ${resourceId}`,
              404
            )
          );
        }

        if (!suite.isActive) {
          return next(
            new AppError('Selected suite/kennel is marked as inactive', 404)
          );
        }

        if (suite.type && finalSuiteType && suite.type !== finalSuiteType) {
          return next(
            new AppError(
              `Selected suite/kennel type (${suite.type}) doesn't match requested type (${finalSuiteType})`,
              400
            )
          );
        }

        const available = await isSuiteAvailable(
          resourceId,
          startDate,
          endDate
        );
        if (!available) {
          return next(
            new AppError(
              'Selected suite/kennel is not available for the requested dates',
              400
            )
          );
        }
      } else {
        // Auto-assign: find an available suite of the requested type
        const candidateSuites = await prisma.resource.findMany({
          where: { isActive: true, type: finalSuiteType },
          orderBy: { name: 'asc' },
        });

        let found = false;
        for (const suite of candidateSuites) {
          if (await isSuiteAvailable(suite.id, startDate, endDate)) {
            assignedResourceId = suite.id;
            found = true;
            break;
          }
        }

        if (!found && candidateSuites.length > 0) {
          // Fallback to first suite
          assignedResourceId = candidateSuites[0].id;
        } else if (!found) {
          // Create a default suite
          const newSuite = await prisma.resource.create({
            data: {
              name: `Auto-created ${finalSuiteType}`,
              type: finalSuiteType as any,
              capacity: 1,
              isActive: true,
            },
          });
          assignedResourceId = newSuite.id;
        }
      }
    } else {
      assignedResourceId = null;
    }

    // Generate order number and create reservation
    const orderNumber = await generateOrderNumber();
    const tenantId = req.tenantId!;

    const newReservation = await prisma.reservation.create({
      data: {
        tenantId,
        orderNumber,
        customerId,
        petId,
        serviceId,
        startDate,
        endDate,
        resourceId: assignedResourceId,
        status,
        notes,
      },
      include: {
        customer: true,
        pet: true,
        resource: true,
      },
    });

    // Audit log
    await tenantAuditLog.logReservation(
      req,
      AuditAction.CREATE,
      newReservation.id,
      `${newReservation.pet?.name || 'Unknown'} - ${newReservation.startDate}`,
      { newValue: newReservation }
    );

    res.status(201).json({
      status: 'success',
      data: newReservation,
    });
  } catch (error) {
    logger.error('Error in createReservation', { error });
    next(error);
  }
};

/**
 * Update a reservation
 */
export const updateReservation = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Reservation ID is required'
    );
    const { suiteType, ...reservationData } = req.body;

    // Validate status if being updated
    if (reservationData.status) {
      const validStatuses = Object.values(ReservationStatus);
      if (!validStatuses.includes(reservationData.status)) {
        return next(
          new AppError(
            `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            400
          )
        );
      }
    }

    // Validate customer/pet relationship if being updated
    if (reservationData.customerId && reservationData.petId) {
      const customer = await prisma.customer.findUnique({
        where: { id: reservationData.customerId },
      });

      if (!customer) {
        return next(new AppError('Customer not found', 404));
      }

      const pet = await prisma.pet.findUnique({
        where: { id: reservationData.petId },
      });

      if (!pet) {
        return next(new AppError('Pet not found', 404));
      }

      if (pet.customerId !== reservationData.customerId) {
        return next(
          new AppError('The pet does not belong to this customer', 400)
        );
      }
    } else if (reservationData.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: reservationData.customerId },
      });

      if (!customer) {
        return next(new AppError('Customer not found', 404));
      }

      const currentReservation = await prisma.reservation.findUnique({
        where: { id },
        include: { pet: true },
      });

      if (!currentReservation) {
        return next(new AppError('Reservation not found', 404));
      }

      if (currentReservation.pet.customerId !== reservationData.customerId) {
        return next(
          new AppError('The pet does not belong to this customer', 400)
        );
      }
    } else if (reservationData.petId) {
      const pet = await prisma.pet.findUnique({
        where: { id: reservationData.petId },
      });

      if (!pet) {
        return next(new AppError('Pet not found', 404));
      }

      const currentReservation = await prisma.reservation.findUnique({
        where: { id },
      });

      if (!currentReservation) {
        return next(new AppError('Reservation not found', 404));
      }

      if (pet.customerId !== currentReservation.customerId) {
        return next(
          new AppError('The pet does not belong to this customer', 400)
        );
      }
    }

    // Handle auto-assignment based on suiteType
    const shouldAutoAssign =
      suiteType &&
      (reservationData.resourceId === null || !reservationData.resourceId);

    if (shouldAutoAssign) {
      const candidateSuites = await prisma.resource.findMany({
        where: { type: suiteType, isActive: true },
        orderBy: { name: 'asc' },
      });

      const currentReservation = await prisma.reservation.findUnique({
        where: { id },
      });

      let found = false;
      for (const suite of candidateSuites) {
        const startDateToCheck =
          reservationData.startDate || currentReservation?.startDate;
        const endDateToCheck =
          reservationData.endDate || currentReservation?.endDate;

        if (
          startDateToCheck &&
          endDateToCheck &&
          (await isSuiteAvailable(
            suite.id,
            startDateToCheck,
            endDateToCheck,
            id
          ))
        ) {
          reservationData.resourceId = suite.id;
          found = true;
          break;
        }
      }

      if (!found && candidateSuites.length > 0) {
        reservationData.resourceId = candidateSuites[0].id;
      } else if (!found) {
        const newSuite = await prisma.resource.create({
          data: {
            name: `Auto-created ${suiteType}`,
            type: suiteType as any,
            capacity: 1,
            isActive: true,
          },
        });
        reservationData.resourceId = newSuite.id;
      }
    }

    // Get existing reservation for audit
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: { customer: true, pet: true, resource: true },
    });

    // Update the reservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: reservationData,
      include: {
        customer: true,
        pet: true,
        resource: true,
      },
    });

    // Audit log
    await tenantAuditLog.logReservation(
      req,
      AuditAction.UPDATE,
      id,
      `${updatedReservation.pet?.name || 'Unknown'} - ${
        updatedReservation.startDate
      }`,
      { previousValue: existingReservation, newValue: updatedReservation }
    );

    res.status(200).json({
      status: 'success',
      data: updatedReservation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a reservation
 */
export const deleteReservation = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Reservation ID is required'
    );
    const tenantId = req.tenantId;

    // Get reservation before deletion for audit
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: { customer: true, pet: true, resource: true },
    });

    if (!existingReservation) {
      return next(AppError.notFoundError('Reservation', id));
    }

    // First, unlink any invoices that reference this reservation
    // This prevents foreign key constraint violations
    await prisma.invoice.updateMany({
      where: {
        reservationId: id,
        tenantId: tenantId,
      },
      data: {
        reservationId: null,
      },
    });

    logger.info(`Unlinked invoices for reservation ${id} before deletion`);

    // Delete any add-on services linked to this reservation
    await prisma.reservationAddOn.deleteMany({
      where: {
        reservationId: id,
      },
    });

    logger.info(`Deleted add-ons for reservation ${id} before deletion`);

    await prisma.reservation.delete({
      where: { id },
    });

    // Audit log
    if (existingReservation) {
      await tenantAuditLog.logReservation(
        req,
        AuditAction.DELETE,
        id,
        `${existingReservation.pet?.name || 'Unknown'} - ${
          existingReservation.startDate
        }`,
        { previousValue: existingReservation, severity: AuditSeverity.CRITICAL }
      );
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
