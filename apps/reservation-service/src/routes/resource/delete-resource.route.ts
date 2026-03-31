import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Delete a resource
 * Implements schema alignment strategy with proper error handling
 * Updated to use standardized error handling pattern
 */
route.use('/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId =
    req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
  if (!tenantId) {
    throw AppError.authorizationError('Tenant ID is required');
  }

  if (!id) {
    throw AppError.validationError('Resource ID is required');
  }

  logger.info(
    `Attempting to delete resource with ID: ${id} for tenant: ${tenantId}`
  );

  const reservationsUsingResource = await safeExecutePrismaQuery(
    async () => {
      const whereConditions: any = {
        resourceId: id,
        tenantId,
      };

      return await prisma.reservation.count({
        where: whereConditions,
      });
    },
    0,
    `Error checking reservations for resource with ID: ${id}`
  );

  if (reservationsUsingResource && reservationsUsingResource > 0) {
    throw AppError.conflictError(
      'Cannot delete resource that is used in reservations',
      { resourceId: id, reservationCount: reservationsUsingResource }
    );
  }

  const existingResource = await safeExecutePrismaQuery(
    async () => {
      return await prisma.resource.findFirst({
        where: { id, tenantId },
      });
    },
    null,
    `Error verifying resource ownership before deletion: ${id}`
  );

  if (!existingResource) {
    throw AppError.notFoundError('Resource', id);
  }

  const deleteResult = await safeExecutePrismaQuery(
    async () => {
      return await prisma.resource.deleteMany({
        where: { id, tenantId },
      });
    },
    { count: 0 },
    `Error deleting resource with ID: ${id}`
  );

  if (!deleteResult || deleteResult.count === 0) {
    throw AppError.notFoundError('Resource', id);
  }

  logger.success(`Successfully deleted resource: ${id}`);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Resource deleted successfully',
  });
});
