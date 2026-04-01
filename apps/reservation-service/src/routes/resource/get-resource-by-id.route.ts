import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Get a single resource by ID
 * Implements schema alignment strategy with fallback to null
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

  logger.info(`Fetching resource with ID: ${id} for tenant: ${tenantId}`);

  const resource = await safeExecutePrismaQuery(
    async () => {
      return await prisma.resource.findFirst({
        where: {
          id,
          tenantId,
        },
      });
    },
    null,
    `Error fetching resource with ID: ${id}`
  );

  if (!resource) {
    throw AppError.notFoundError('Resource', id);
  }

  logger.success(`Successfully retrieved resource: ${id}`);

  res.status(200).json({
    success: true,
    status: 'success',
    data: resource,
  });
});
