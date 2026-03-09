/**
 * Delete Reservation Controller
 * 
 * This file contains the controller method for deleting reservations.
 * It implements schema alignment strategy with defensive programming.
 */

import { Request, Response } from 'express';
import { AppError } from '../../utils/service';
import { catchAsync } from '../../middleware/catchAsync';
import { logger } from '../../utils/logger';
import { 
  ExtendedReservationWhereInput
} from '../../types/prisma-extensions';
import { safeExecutePrismaQuery, prisma } from './utils/prisma-helpers';

/**
 * Delete a reservation
 * Implements schema alignment strategy with defensive programming
 * Uses standardized error handling pattern
 * 
 * @route DELETE /api/v1/reservations/:id
 * @param {string} req.params.id - Reservation ID
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 */
export const deleteReservation = catchAsync(async (
  req: Request,
  res: Response
) => {
  // Generate a unique request ID for logging
  const requestId = `delete-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  logger.info(`Processing delete reservation request for ID: ${req.params.id}`, { requestId });
  
  // Get tenant ID from request - added by tenant middleware
  // In development mode, use a default tenant ID if not provided
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
  
  // First, check if the reservation exists and belongs to this tenant
  const existingReservation = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.findFirst({
        where: {
          id,
          tenantId // CRITICAL: Enforce tenant isolation
        } as ExtendedReservationWhereInput,
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          customerId: true,
          petId: true,
          resourceId: true
        }
      });
    },
    null,
    `Error finding reservation with ID ${id}`,
    true // Enable throwError flag
  );

  if (!existingReservation) {
    logger.warn(`Reservation not found or does not belong to tenant: ${tenantId}`, { requestId });
    throw AppError.notFoundError('Reservation not found');
  }
  
  logger.info(`Found existing reservation: ${id}`, { requestId });
  
  // Check if the reservation has already started or is in progress
  const currentDate = new Date();
  const startDate = existingReservation.startDate ? new Date(existingReservation.startDate) : null;
  const endDate = existingReservation.endDate ? new Date(existingReservation.endDate) : null;
  
  let warnings = [];
  
  if (startDate && startDate <= currentDate) {
    if (endDate && endDate >= currentDate) {
      logger.warn(`Attempting to delete an active reservation: ${id}`, { requestId });
      warnings.push('Deleting an active reservation that is currently in progress.');
    } else {
      logger.warn(`Attempting to delete a past reservation: ${id}`, { requestId });
      warnings.push('Deleting a reservation that has already occurred.');
    }
  }
  
  // Check if the reservation has any related records that need to be cleaned up
  try {
    // First clean up any add-on services
    await safeExecutePrismaQuery(
      async () => {
        return await prisma.reservationAddOn.deleteMany({
          where: {
            reservationId: id,
            // organizationId removed as it's not in the schema
          } as any
        });
      },
      null,
      `Error deleting add-on services for reservation ${id}`
    );
    
    logger.info(`Successfully cleaned up related add-on services for reservation: ${id}`, { requestId });
    
    // Clean up any invoices linked to this reservation
    // Set reservationId to null instead of deleting the invoice
    await safeExecutePrismaQuery(
      async () => {
        return await prisma.invoice.updateMany({
          where: {
            reservationId: id,
            tenantId
          },
          data: {
            reservationId: null
          }
        });
      },
      null,
      `Error unlinking invoices for reservation ${id}`
    );
    
    logger.info(`Successfully unlinked invoices for reservation: ${id}`, { requestId });
  } catch (error) {
    logger.warn(`Error cleaning up related records for reservation ${id}:`, { requestId, error });
    warnings.push('There was an issue cleaning up related records, but the reservation will still be deleted.');
  }

  // Delete reservation with safe execution
  await safeExecutePrismaQuery(
    async () => {
      // For delete operations, we need to use a WhereUniqueInput which only allows unique identifiers
      // Since we've already verified the reservation exists and belongs to this tenant, we can safely delete by ID
      return await prisma.reservation.delete({
        where: {
          id
        }
      });
    },
    null, // Null fallback if there's an error
    `Error deleting reservation with ID ${id}`,
    true // Enable throwError flag
  );
  
  logger.success(`Successfully deleted reservation: ${id}`, { requestId });
  
  // Prepare response message
  let message = 'Reservation deleted successfully';
  if (warnings.length > 0) {
    message += ` with warnings: ${warnings.join(' ')}`;  
  }

  res.status(200).json({
    status: 'success',
    message,
    data: null
  });
});
