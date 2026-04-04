/**
 * Reservation Add-Ons Controller
 *
 * Handles adding add-on services to existing reservations
 */

import { type RequestHandler, type Response } from 'express';
import { assertStringRouteParam } from '@tailtown/shared';
import { type TenantRequest } from '../../types/request.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../utils/service.js';
import { prisma } from './utils/prisma-helpers.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../env.js';

/**
 * Add add-on services to a reservation
 * POST /api/reservations/:id/add-ons
 */
export const addAddOnsToReservation: RequestHandler = catchAsync(
  async (req: TenantRequest, res: Response) => {
    const tenantId = req.tenantId || (env.NODE_ENV !== 'production' && 'dev');
    const reservationId = assertStringRouteParam(
      req.params.id,
      req.originalUrl,
      AppError.validationError,
      'Reservation ID is required'
    );
    const { addOns } = req.body;

    if (!tenantId) {
      throw AppError.authorizationError('Tenant ID is required');
    }

    if (!addOns || !Array.isArray(addOns) || addOns.length === 0) {
      throw new AppError(
        'Add-ons array is required and must not be empty',
        400
      );
    }

    logger.info(
      `Adding ${addOns.length} add-ons to reservation ${reservationId}`,
      { tenantId, reservationId, addOns }
    );

    try {
      // First, verify the reservation exists and belongs to this tenant
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          tenantId: tenantId,
        },
      });

      if (!reservation) {
        throw new AppError('Reservation not found', 404);
      }

      // Validate that all add-on services exist
      const addOnServiceIds = addOns.map((addOn: any) => addOn.serviceId);
      const validAddOnServices = await prisma.addOnService.findMany({
        where: {
          id: { in: addOnServiceIds },
          tenantId: tenantId,
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

      // Create reservation add-ons
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

        // Create multiple entries if quantity > 1
        const quantity = addOn.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          reservationAddOns.push({
            tenantId: tenantId,
            reservationId: reservationId,
            addOnId: addOn.serviceId,
            price: addOnService.price,
            notes: addOn.notes || null,
          });
        }
      }

      // Insert all add-ons in a transaction
      const createdAddOns = await prisma.$transaction(async (tx: any) => {
        return await tx.reservationAddOn.createMany({
          data: reservationAddOns,
        });
      });

      logger.success(
        `Successfully added ${createdAddOns.count} add-ons to reservation ${reservationId}`
      );

      // Return the updated reservation with add-ons
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
  }
);
