/**
 * Standing Reservation Controller
 *
 * Handles CRUD operations for standing (recurring) reservations
 * and generation of actual reservations from templates
 */

import { type Response, type NextFunction } from 'express';
import { RecurrenceFrequency } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';
import { type TenantRequest } from '../middleware/tenant.middleware.js';
import { prisma } from '../config/prisma.js';

/**
 * Get all standing reservations for a tenant
 */
export const getAllStandingReservations = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { customerId, isActive } = req.query;

    const where: any = { tenantId };
    if (customerId) where.customerId = customerId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const standingReservations = await prisma.standingReservation.findMany({
      where,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        pet: {
          select: { id: true, name: true, type: true, breed: true },
        },
        service: {
          select: { id: true, name: true, price: true, serviceCategory: true },
        },
        resource: {
          select: { id: true, name: true, type: true },
        },
        staffAssigned: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { generatedReservations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: standingReservations.length,
      data: standingReservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get standing reservations for a specific customer
 */
export const getCustomerStandingReservations = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { customerId } = req.params;

    const standingReservations = await prisma.standingReservation.findMany({
      where: { tenantId, customerId },
      include: {
        pet: {
          select: { id: true, name: true, type: true },
        },
        service: {
          select: { id: true, name: true, price: true, serviceCategory: true },
        },
        resource: {
          select: { id: true, name: true },
        },
        staffAssigned: {
          select: { id: true, firstName: true, lastName: true },
        },
        generatedReservations: {
          where: {
            scheduledDate: { gte: new Date() },
          },
          orderBy: { scheduledDate: 'asc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: standingReservations.length,
      data: standingReservations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single standing reservation by ID
 */
export const getStandingReservationById = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const standingReservation = await prisma.standingReservation.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        pet: {
          select: { id: true, name: true, type: true, breed: true },
        },
        service: {
          select: { id: true, name: true, price: true, serviceCategory: true },
        },
        resource: {
          select: { id: true, name: true, type: true },
        },
        staffAssigned: {
          select: { id: true, firstName: true, lastName: true },
        },
        generatedReservations: {
          orderBy: { scheduledDate: 'desc' },
          take: 50,
        },
      },
    });

    if (!standingReservation) {
      return next(new AppError('Standing reservation not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: standingReservation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new standing reservation
 */
export const createStandingReservation = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const {
      customerId,
      petId,
      serviceId,
      resourceId,
      staffAssignedId,
      name,
      frequency,
      daysOfWeek,
      dayOfMonth,
      startTime,
      endTime,
      effectiveFrom,
      effectiveUntil,
      notes,
      autoConfirm,
      generateAheadDays,
    } = req.body;

    // Validate required fields
    if (
      !customerId ||
      !petId ||
      !serviceId ||
      !name ||
      !frequency ||
      !startTime ||
      !endTime ||
      !effectiveFrom
    ) {
      return next(new AppError('Missing required fields', 400));
    }

    // Validate frequency
    if (!['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(frequency)) {
      return next(
        new AppError(
          'Invalid frequency. Must be DAILY, WEEKLY, BIWEEKLY, or MONTHLY',
          400
        )
      );
    }

    // Validate daysOfWeek for weekly/biweekly
    if (
      (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') &&
      (!daysOfWeek || daysOfWeek.length === 0)
    ) {
      return next(
        new AppError('Days of week required for weekly/biweekly frequency', 400)
      );
    }

    // Validate dayOfMonth for monthly
    if (
      frequency === 'MONTHLY' &&
      (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)
    ) {
      return next(
        new AppError(
          'Valid day of month (1-31) required for monthly frequency',
          400
        )
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Verify pet exists and belongs to customer
    const pet = await prisma.pet.findFirst({
      where: { id: petId, customerId, tenantId },
    });
    if (!pet) {
      return next(
        new AppError('Pet not found or does not belong to customer', 404)
      );
    }

    // Verify service exists
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) {
      return next(new AppError('Service not found', 404));
    }

    const standingReservation = await prisma.standingReservation.create({
      data: {
        tenantId,
        customerId,
        petId,
        serviceId,
        resourceId: resourceId || null,
        staffAssignedId: staffAssignedId || null,
        name,
        frequency: frequency as RecurrenceFrequency,
        daysOfWeek: daysOfWeek || [],
        dayOfMonth: dayOfMonth || null,
        startTime,
        endTime,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        notes: notes || null,
        autoConfirm: autoConfirm || false,
        generateAheadDays: generateAheadDays || 30,
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        pet: {
          select: { id: true, name: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: standingReservation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a standing reservation
 */
export const updateStandingReservation = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const updateData = req.body;

    // Verify exists
    const existing = await prisma.standingReservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return next(new AppError('Standing reservation not found', 404));
    }

    // Build update object
    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.frequency !== undefined)
      data.frequency = updateData.frequency;
    if (updateData.daysOfWeek !== undefined)
      data.daysOfWeek = updateData.daysOfWeek;
    if (updateData.dayOfMonth !== undefined)
      data.dayOfMonth = updateData.dayOfMonth;
    if (updateData.startTime !== undefined)
      data.startTime = updateData.startTime;
    if (updateData.endTime !== undefined) data.endTime = updateData.endTime;
    if (updateData.effectiveFrom !== undefined)
      data.effectiveFrom = new Date(updateData.effectiveFrom);
    if (updateData.effectiveUntil !== undefined)
      data.effectiveUntil = updateData.effectiveUntil
        ? new Date(updateData.effectiveUntil)
        : null;
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
    if (updateData.autoConfirm !== undefined)
      data.autoConfirm = updateData.autoConfirm;
    if (updateData.generateAheadDays !== undefined)
      data.generateAheadDays = updateData.generateAheadDays;
    if (updateData.resourceId !== undefined)
      data.resourceId = updateData.resourceId || null;
    if (updateData.staffAssignedId !== undefined)
      data.staffAssignedId = updateData.staffAssignedId || null;

    const standingReservation = await prisma.standingReservation.update({
      where: { id },
      data,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        pet: {
          select: { id: true, name: true },
        },
        service: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: standingReservation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a standing reservation
 */
export const deleteStandingReservation = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await prisma.standingReservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return next(new AppError('Standing reservation not found', 404));
    }

    await prisma.standingReservation.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate reservations from a standing reservation template
 */
export const generateReservations = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { untilDate } = req.body;

    const standingReservation = await prisma.standingReservation.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        service: true,
      },
    });

    if (!standingReservation) {
      return next(
        new AppError('Standing reservation not found or inactive', 404)
      );
    }

    // Calculate dates to generate
    const generateUntil = untilDate
      ? new Date(untilDate)
      : new Date(
          Date.now() +
            standingReservation.generateAheadDays * 24 * 60 * 60 * 1000
        );

    const startFrom = standingReservation.lastGeneratedDate
      ? new Date(
          standingReservation.lastGeneratedDate.getTime() + 24 * 60 * 60 * 1000
        )
      : new Date(standingReservation.effectiveFrom);

    // Don't generate past the effective until date
    const effectiveEnd = standingReservation.effectiveUntil || generateUntil;
    const endDate = generateUntil < effectiveEnd ? generateUntil : effectiveEnd;

    // Generate dates based on frequency
    const datesToGenerate = calculateRecurrenceDates(
      startFrom,
      endDate,
      standingReservation.frequency,
      standingReservation.daysOfWeek,
      standingReservation.dayOfMonth
    );

    // Create instances for each date
    const createdInstances = [];
    for (const date of datesToGenerate) {
      // Check if instance already exists
      const existing = await prisma.standingReservationInstance.findFirst({
        where: {
          standingReservationId: id,
          scheduledDate: date,
        },
      });

      if (!existing) {
        const instance = await prisma.standingReservationInstance.create({
          data: {
            tenantId,
            standingReservationId: id,
            scheduledDate: date,
            status: 'PENDING',
          },
        });
        createdInstances.push(instance);
      }
    }

    // Update last generated date
    if (datesToGenerate.length > 0) {
      await prisma.standingReservation.update({
        where: { id },
        data: {
          lastGeneratedDate: datesToGenerate[datesToGenerate.length - 1],
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        generatedCount: createdInstances.length,
        instances: createdInstances,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Skip a specific instance of a standing reservation
 */
export const skipInstance = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { id, instanceId } = req.params;
    const { reason } = req.body;

    const instance = await prisma.standingReservationInstance.findFirst({
      where: { id: instanceId, standingReservationId: id, tenantId },
    });

    if (!instance) {
      return next(new AppError('Instance not found', 404));
    }

    const updated = await prisma.standingReservationInstance.update({
      where: { id: instanceId },
      data: {
        status: 'SKIPPED',
        skipReason: reason || 'Manually skipped',
      },
    });

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upcoming instances for a standing reservation
 */
export const getUpcomingInstances = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { limit = 20 } = req.query;

    const instances = await prisma.standingReservationInstance.findMany({
      where: {
        tenantId,
        standingReservationId: id,
        scheduledDate: { gte: new Date() },
      },
      orderBy: { scheduledDate: 'asc' },
      take: parseInt(limit as string),
    });

    res.status(200).json({
      status: 'success',
      results: instances.length,
      data: instances,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to calculate recurrence dates
 */
function calculateRecurrenceDates(
  startDate: Date,
  endDate: Date,
  frequency: RecurrenceFrequency,
  daysOfWeek: number[],
  dayOfMonth: number | null
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    let shouldAdd = false;

    switch (frequency) {
      case 'DAILY':
        shouldAdd = true;
        break;

      case 'WEEKLY':
        shouldAdd = daysOfWeek.includes(current.getDay());
        break;

      case 'BIWEEKLY':
        // Check if it's the right day and the right week
        const weekNumber = Math.floor(
          (current.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        shouldAdd =
          daysOfWeek.includes(current.getDay()) && weekNumber % 2 === 0;
        break;

      case 'MONTHLY':
        shouldAdd = dayOfMonth !== null && current.getDate() === dayOfMonth;
        break;
    }

    if (shouldAdd) {
      dates.push(new Date(current));
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}
