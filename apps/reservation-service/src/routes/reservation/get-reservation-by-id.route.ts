import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { getReservationActivityLogs } from '../../services/reservation-activity.service.js';
import { type ExtendedReservationWhereInput } from '../../types/prisma-extensions.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Get a single reservation by ID
 * Implements schema alignment strategy with defensive programming
 * Uses standardized error handling pattern
 *
 * @route GET /api/v1/reservations/:id
 * @param {string} req.params.id - Reservation ID
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 */
route.use('/:id', async (req, res) => {
  const requestId = `getById-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  logger.info(
    `Processing get reservation by ID request for ID: ${req.params.id}`,
    { requestId }
  );

  const tenantId = req.tenantId;
  if (!tenantId) {
    logger.warn(`Missing tenant ID in request`, { requestId });
    throw AppError.authorizationError('Tenant ID is required');
  }

  const { id } = req.params;
  if (!id) {
    logger.warn(`Missing reservation ID in request`, { requestId });
    throw AppError.validationError('Reservation ID is required');
  }

  const reservation = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.findFirst({
        where: {
          id,
          tenantId,
        } as ExtendedReservationWhereInput,
        select: {
          id: true,
          tenantId: true,
          startDate: true,
          endDate: true,
          status: true,
          externalId: true,
          createdAt: true,
          updatedAt: true,
          customerId: true,
          petId: true,
          serviceId: true,
          resourceId: true,
          resource: {
            select: {
              name: true,
              type: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              price: true,
              description: true,
              serviceCategory: true,
            },
          },
          addOnServices: {
            select: {
              id: true,
              addOnId: true,
              price: true,
              notes: true,
              addOn: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                },
              },
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
              subtotal: true,
              taxAmount: true,
              discount: true,
              payments: {
                select: {
                  id: true,
                  amount: true,
                  method: true,
                  status: true,
                  paymentDate: true,
                },
              },
            },
          },
        },
      });
    },
    null,
    `Error fetching reservation with ID ${id}`,
    true
  );

  if (!reservation) {
    logger.warn(
      `Reservation not found or does not belong to tenant: ${tenantId}`,
      { requestId }
    );
    throw AppError.notFoundError('Reservation not found');
  }

  let activityLogs: any[] = [];
  try {
    activityLogs = await getReservationActivityLogs(tenantId, id, 20);
  } catch (err) {
    logger.warn(`Failed to fetch activity logs for reservation ${id}`, {
      err,
    });
  }

  logger.info(`Found reservation: ${id}`, { requestId });

  res.status(200).json({
    status: 'success',
    data: {
      reservation,
      activityLogs,
    },
  });
});
