import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { ResourceType } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Get all resources with pagination and filtering
 * Implements schema alignment strategy with fallback to empty array
 * Updated to use standardized error handling pattern
 */
route.use('/', async (req, res) => {
  const tenantId =
    req.tenantId || (process.env.NODE_ENV !== 'production' && 'dev');
  if (!tenantId) {
    throw AppError.authorizationError('Tenant ID is required');
  }

  logger.info(
    `[RESOURCES] Getting resources for tenantId: ${tenantId}, header: ${req.headers['x-tenant-id']}`
  );

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const whereConditions: any = { tenantId };

  logger.info(
    `[RESOURCES] Where conditions: ${JSON.stringify(whereConditions)}`
  );

  if (req.query.type) {
    try {
      const typeStr = String(req.query.type);

      if (typeStr.includes(',')) {
        const types = typeStr.split(',').map((t) => t.trim().toUpperCase());
        const validTypes = types.filter((t) =>
          Object.values(ResourceType).includes(t as ResourceType)
        );

        if (validTypes.length > 0) {
          whereConditions.type = {
            in: validTypes as ResourceType[],
          };
          logger.debug(
            `Multiple types filter applied: ${JSON.stringify(whereConditions.type)}`
          );
        } else {
          logger.warn(
            `No valid resource types found in filter: ${JSON.stringify(types)}`
          );
        }
      } else if (typeStr.toLowerCase() === 'suite') {
        whereConditions.type = {
          in: [
            ResourceType.SUITE,
            ResourceType.STANDARD_SUITE,
            ResourceType.STANDARD_PLUS_SUITE,
            ResourceType.VIP_SUITE,
          ],
        };
        logger.debug(
          `Suite wildcard filter applied: all suite types including SUITE`
        );
      } else if (typeStr.toLowerCase() === 'kennel') {
        whereConditions.type = {
          in: [
            ResourceType.JUNIOR_KENNEL,
            ResourceType.QUEEN_KENNEL,
            ResourceType.KING_KENNEL,
            ResourceType.VIP_ROOM,
            ResourceType.CAT_CONDO,
            ResourceType.KENNEL,
          ],
        };
        logger.debug(`Kennel wildcard filter applied: all kennel types`);
      } else {
        const upperType = typeStr.toUpperCase();
        if (Object.values(ResourceType).includes(upperType as ResourceType)) {
          whereConditions.type = upperType as ResourceType;
          logger.debug(`Single type filter applied: ${whereConditions.type}`);
        } else {
          logger.warn(`Invalid resource type in filter: ${typeStr}`);
        }
      }
    } catch (error) {
      logger.error(`Error processing resource type filter: ${error}`);
    }
  }

  if (req.query.search) {
    whereConditions.name = {
      contains: req.query.search as string,
      mode: 'insensitive',
    };
  }

  logger.info(
    `Fetching resources with filters: ${JSON.stringify({
      tenantId,
      page,
      limit,
      type: req.query.type,
      search: req.query.search,
    })}`
  );

  const totalCount = await safeExecutePrismaQuery(
    async () => {
      return await prisma.resource.count({
        where: whereConditions as any,
      });
    },
    0,
    'Error counting resources'
  );

  const resources = await safeExecutePrismaQuery(
    async () => {
      return await prisma.resource.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      });
    },
    [],
    'Error fetching resources'
  );

  logger.success(`Successfully retrieved ${resources?.length || 0} resources`);

  res.status(200).json({
    success: true,
    status: 'success',
    results: resources?.length || 0,
    totalPages: Math.ceil((totalCount || 0) / limit),
    currentPage: page,
    data: resources || [],
  });
});
