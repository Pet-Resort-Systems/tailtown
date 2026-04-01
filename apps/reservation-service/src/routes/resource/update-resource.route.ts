import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Update an existing resource
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

  const {
    name,
    type,
    size,
    capacity,
    maxPets,
    description,
    isActive,
    suiteNumber,
  } = req.body;

  if (
    name === undefined &&
    type === undefined &&
    size === undefined &&
    capacity === undefined &&
    maxPets === undefined &&
    description === undefined &&
    isActive === undefined &&
    suiteNumber === undefined
  ) {
    throw AppError.validationError(
      'At least one field must be provided for update'
    );
  }

  logger.info(`Updating resource with ID: ${id} for tenant: ${tenantId}`);

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (size !== undefined) updateData.size = size;
  if (capacity !== undefined) updateData.capacity = parseInt(capacity);
  if (maxPets !== undefined) updateData.maxPets = parseInt(maxPets);
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.isActive = isActive;

  if (suiteNumber !== undefined) {
    const parsedSuiteNumber = parseInt(String(suiteNumber), 10);
    if (!Number.isNaN(parsedSuiteNumber)) {
      updateData.suiteNumber = parsedSuiteNumber;
    } else {
      updateData.suiteNumber = null;
    }
  }

  const existingResource = await safeExecutePrismaQuery(
    async () => {
      return await prisma.resource.findFirst({
        where: { id, tenantId },
      });
    },
    null,
    `Error verifying resource ownership before update: ${id}`
  );
  if (!existingResource) {
    throw AppError.notFoundError('Resource', id);
  }

  const updatedResource = await safeExecutePrismaQuery(
    async () => {
      const whereClause: any = {
        id,
      };

      return await prisma.resource.update({
        where: whereClause,
        data: updateData,
      });
    },
    null,
    `Error updating resource with ID: ${id}`,
    true
  );

  logger.success(`Successfully updated resource: ${id}`);

  res.status(200).json({
    success: true,
    status: 'success',
    data: updatedResource,
  });
});
