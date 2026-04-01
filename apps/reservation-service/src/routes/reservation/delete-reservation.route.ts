import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { type ExtendedReservationWhereInput } from '../../types/prisma-extensions.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Delete a reservation
 * Implements schema alignment strategy with defensive programming
 * Uses standardized error handling pattern
 *
 * @route DELETE /api/v1/reservations/:id
 * @param {string} req.params.id - Reservation ID
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 */
route.use('/:id', async (req, res) => {
  const requestId = `delete-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  logger.info(
    `Processing delete reservation request for ID: ${req.params.id}`,
    { requestId }
  );

  const isDev = process.env.NODE_ENV === 'development';
  const tenantId = req.tenantId || (isDev ? 'dev-tenant-001' : undefined);
  if (!tenantId) {
    logger.warn(`Missing tenant ID in request`, { requestId });
    throw AppError.authorizationError('Tenant ID is required');
  }

  const { id } = req.params;
  if (!id) {
    logger.warn(`Missing reservation ID in request`, { requestId });
    throw AppError.validationError('Reservation ID is required');
  }

  const existingReservation = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.findFirst({
        where: {
          id,
          tenantId,
        } as ExtendedReservationWhereInput,
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          customerId: true,
          petId: true,
          resourceId: true,
        },
      });
    },
    null,
    `Error finding reservation with ID ${id}`,
    true
  );

  if (!existingReservation) {
    logger.warn(
      `Reservation not found or does not belong to tenant: ${tenantId}`,
      { requestId }
    );
    throw AppError.notFoundError('Reservation not found');
  }

  logger.info(`Found existing reservation: ${id}`, { requestId });

  const currentDate = new Date();
  const startDate = existingReservation.startDate
    ? new Date(existingReservation.startDate)
    : null;
  const endDate = existingReservation.endDate
    ? new Date(existingReservation.endDate)
    : null;

  const warnings: string[] = [];

  if (startDate && startDate <= currentDate) {
    if (endDate && endDate >= currentDate) {
      logger.warn(`Attempting to delete an active reservation: ${id}`, {
        requestId,
      });
      warnings.push(
        'Deleting an active reservation that is currently in progress.'
      );
    } else {
      logger.warn(`Attempting to delete a past reservation: ${id}`, {
        requestId,
      });
      warnings.push('Deleting a reservation that has already occurred.');
    }
  }

  try {
    await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservationAddOn.deleteMany({
          where: {
            reservationId: id,
          } as any,
        });
      },
      null,
      `Error deleting add-on services for reservation ${id}`
    );

    logger.info(
      `Successfully cleaned up related add-on services for reservation: ${id}`,
      { requestId }
    );

    await safeExecutePrismaQuery(
      async () => {
        return await prisma.invoice.updateMany({
          where: {
            reservationId: id,
            tenantId,
          },
          data: {
            reservationId: null,
          },
        });
      },
      null,
      `Error unlinking invoices for reservation ${id}`
    );

    logger.info(`Successfully unlinked invoices for reservation: ${id}`, {
      requestId,
    });
  } catch (error) {
    logger.warn(`Error cleaning up related records for reservation ${id}:`, {
      requestId,
      error,
    });
    warnings.push(
      'There was an issue cleaning up related records, but the reservation will still be deleted.'
    );
  }

  await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.delete({
        where: {
          id,
        },
      });
    },
    null,
    `Error deleting reservation with ID ${id}`,
    true
  );

  logger.success(`Successfully deleted reservation: ${id}`, { requestId });

  let message = 'Reservation deleted successfully';
  if (warnings.length > 0) {
    message += ` with warnings: ${warnings.join(' ')}`;
  }

  res.status(200).json({
    status: 'success',
    message,
    data: null,
  });
});
