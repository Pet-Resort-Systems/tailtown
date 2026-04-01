import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Create a new resource
 * Implements schema alignment strategy with proper error handling
 * Updated to use standardized error handling pattern
 */
route.use('/', async (req, res) => {
  const tenantId =
    req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
  if (!tenantId) {
    throw AppError.authorizationError('Tenant ID is required');
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

  if (!name) {
    throw AppError.validationError('Name is required');
  }

  if (!type) {
    throw AppError.validationError('Type is required');
  }

  logger.info(`Creating new resource of type: ${type} for tenant: ${tenantId}`);

  const newResource = await safeExecutePrismaQuery(
    async () => {
      const data: any = {
        name,
        type,
        size: size || undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        maxPets: maxPets ? parseInt(maxPets) : 1,
        description,
        isActive: isActive !== undefined ? isActive : true,
        tenantId,
      };

      if (suiteNumber !== undefined) {
        const parsedSuiteNumber = parseInt(String(suiteNumber), 10);
        if (!Number.isNaN(parsedSuiteNumber)) {
          data.suiteNumber = parsedSuiteNumber;
        }
      }

      return await prisma.resource.create({
        data,
      });
    },
    null,
    'Error creating resource',
    true
  );

  if (!newResource) {
    throw AppError.serverError('Failed to create resource', {
      resourceData: req.body,
    });
  }

  logger.success(`Successfully created resource: ${newResource.id}`);

  res.status(201).json({
    success: true,
    status: 'success',
    data: newResource,
  });
});
