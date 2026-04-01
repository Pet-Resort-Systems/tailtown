import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();

/**
 * Add add-on services to a reservation
 * POST /api/reservations/:id/add-ons
 */
route.use('/:id/add-ons', async (req, res) => {
  const tenantId =
    req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
  const reservationId = req.params.id;
  const { addOns } = req.body;

  if (!tenantId) {
    throw AppError.authorizationError('Tenant ID is required');
  }

  if (!reservationId) {
    throw new AppError('Reservation ID is required', 400);
  }

  if (!addOns || !Array.isArray(addOns) || addOns.length === 0) {
    throw new AppError('Add-ons array is required and must not be empty', 400);
  }

  logger.info(
    `Adding ${addOns.length} add-ons to reservation ${reservationId}`,
    {
      tenantId,
      reservationId,
      addOns,
    }
  );

  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        tenantId,
      },
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    const addOnServiceIds = addOns.map((addOn: any) => addOn.serviceId);
    const validAddOnServices = await prisma.addOnService.findMany({
      where: {
        id: { in: addOnServiceIds },
        tenantId,
        isActive: true,
      },
    });

    if (validAddOnServices.length !== addOnServiceIds.length) {
      const foundIds = validAddOnServices.map((service) => service.id);
      const missingIds = addOnServiceIds.filter(
        (id: string) => !foundIds.includes(id)
      );
      throw new AppError(
        `Invalid or inactive add-on service IDs: ${missingIds.join(', ')}`,
        400
      );
    }

    const reservationAddOns: Array<{
      tenantId: string;
      reservationId: string;
      addOnId: string;
      price: number;
      notes: string | null;
    }> = [];

    for (const addOn of addOns) {
      const addOnService = validAddOnServices.find(
        (service: any) => service.id === addOn.serviceId
      );
      if (!addOnService) continue;

      const quantity = addOn.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        reservationAddOns.push({
          tenantId,
          reservationId,
          addOnId: addOn.serviceId,
          price: addOnService.price,
          notes: addOn.notes || null,
        });
      }
    }

    const createdAddOns = await prisma.$transaction(async (tx: any) => {
      return await tx.reservationAddOn.createMany({
        data: reservationAddOns,
      });
    });

    logger.success(
      `Successfully added ${createdAddOns.count} add-ons to reservation ${reservationId}`
    );

    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        addOnServices: {
          include: {
            addOn: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      status: 'success',
      message: `Successfully added ${createdAddOns.count} add-ons to reservation`,
      data: {
        reservation: updatedReservation,
        addedCount: createdAddOns.count,
      },
    });
  } catch (error: any) {
    logger.error(
      `Error adding add-ons to reservation ${reservationId}:`,
      error
    );
    throw error;
  }
});
