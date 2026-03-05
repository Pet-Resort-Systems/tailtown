/**
 * Customer Reservation Controller
 * 
 * This file contains the controller method for retrieving customer-specific reservations.
 * It implements schema alignment strategy with defensive programming.
 */

import { Request, Response } from 'express';
import { AppError } from '../../utils/service';
import { catchAsync } from '../../middleware/catchAsync';
import { logger } from '../../utils/logger';
import { 
  ExtendedReservationWhereInput,
  ExtendedReservationInclude
} from '../../types/prisma-extensions';
import { safeExecutePrismaQuery, prisma } from './utils/prisma-helpers';
import { customerServiceClient } from '../../clients/customer-service.client';

/**
 * Get all reservations for a specific customer
 * Implements schema alignment strategy with defensive programming
 * Uses standardized error handling pattern
 * 
 * @route GET /api/v1/reservations/customer/:customerId
 * @param {string} req.params.customerId - Customer ID
 * @param {string} req.query.status - Optional filter by reservation status
 * @param {string} req.query.startDate - Optional filter by start date
 * @param {string} req.query.endDate - Optional filter by end date
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 */
export const getCustomerReservations = catchAsync(async (req: Request, res: Response) => {
  // Generate a unique request ID for logging
  const requestId = `getCustomer-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  logger.info(`Processing get customer reservations request for customer: ${req.params.customerId}`, { 
    requestId,
    query: req.query
  });
  
  // Get tenant ID from request - added by tenant middleware
  // In development mode, use a default tenant ID if not provided
  const isDev = process.env.NODE_ENV === 'development';
  const tenantId = req.tenantId || (isDev ? 'dev-tenant-001' : undefined);
  if (!tenantId) {
    logger.warn(`Missing tenant ID in request`, { requestId });
    throw AppError.authorizationError('Tenant ID is required');
  }

  const { customerId } = req.params;
  if (!customerId) {
    logger.warn(`Missing customer ID in request`, { requestId });
    throw AppError.validationError('Customer ID is required');
  }
  
  // Verify customer exists and belongs to tenant via Customer Service API
  try {
    await customerServiceClient.verifyCustomer(customerId, tenantId);
    logger.info(`Verified customer exists via API: ${customerId}`, { requestId });
  } catch (error) {
    logger.error(`Customer verification failed: ${customerId}`, { error, requestId });
    throw error;
  }
  
  // Parse pagination parameters with validation
  let page = 1;
  let limit = 10;
  const warnings: string[] = [];
  
  if (req.query.page) {
    const parsedPage = parseInt(req.query.page as string);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    } else {
      logger.warn(`Invalid page parameter`, { requestId, page: req.query.page });
      warnings.push(`Invalid page parameter: ${req.query.page}, using default: 1`);
    }
  }
  
  if (req.query.limit) {
    const parsedLimit = parseInt(req.query.limit as string);
    if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 500) {
      limit = parsedLimit;
    } else {
      logger.warn(`Invalid limit parameter`, { requestId, limit: req.query.limit });
      warnings.push(`Invalid limit parameter: ${req.query.limit}, using default: 10`);
    }
  }
  
  // Calculate skip value for pagination
  const skip = (page - 1) * limit;
  
  // Build filter object
  const filter: any = {
    // organizationId removed as it's not in the schema
    customerId
  };
  
  // Add optional filters if provided
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Handle date filters
  if (req.query.startDate) {
    try {
      const startDate = new Date(req.query.startDate as string);
      if (!isNaN(startDate.getTime())) {
        filter.startDate = {
          gte: startDate
        };
      } else {
        logger.warn(`Invalid startDate filter`, { requestId, startDate: req.query.startDate });
        warnings.push(`Invalid startDate filter: ${req.query.startDate}, ignoring this filter`);
      }
    } catch (error) {
      logger.warn(`Error parsing startDate filter`, { requestId, startDate: req.query.startDate, error });
      warnings.push(`Error parsing startDate filter: ${req.query.startDate}, ignoring this filter`);
    }
  }
  
  if (req.query.endDate) {
    try {
      const endDate = new Date(req.query.endDate as string);
      if (!isNaN(endDate.getTime())) {
        filter.endDate = {
          lte: endDate
        };
      } else {
        logger.warn(`Invalid endDate filter`, { requestId, endDate: req.query.endDate });
        warnings.push(`Invalid endDate filter: ${req.query.endDate}, ignoring this filter`);
      }
    } catch (error) {
      logger.warn(`Error parsing endDate filter`, { requestId, endDate: req.query.endDate, error });
      warnings.push(`Error parsing endDate filter: ${req.query.endDate}, ignoring this filter`);
    }
  }
  
  // Get total count for pagination
  const totalCount = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.count({
        where: filter as ExtendedReservationWhereInput
      });
    },
    0, // Default to 0 if there's an error
    `Error counting reservations for customer ${customerId}`,
    true // Enable throwError flag
  );
  
  // Get reservations with pagination
  const reservations = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.findMany({
        where: filter as ExtendedReservationWhereInput,
        skip,
        take: limit,
        orderBy: {
          startDate: 'desc'
        },
        include: {
          pet: {
            select: {
              name: true,
              breed: true,
              birthdate: true // Changed from age to birthdate as age doesn't exist in schema
            }
          },
          resource: {
            select: {
              name: true,
              type: true,
              location: true
            }
          },
          addOnServices: {
            select: {
              id: true,
              serviceId: true,
              quantity: true,
              notes: true,
              service: {
                select: {
                  name: true,
                  price: true,
                  description: true
                }
              }
            }
          }
        } as unknown as ExtendedReservationInclude
      });
    },
    [], // Default to empty array if there's an error
    `Error fetching reservations for customer ${customerId}`,
    true // Enable throwError flag
  );
  
  // Calculate pagination metadata
  const totalPages = Math.ceil((totalCount || 0) / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  logger.info(`Found ${reservations ? reservations.length : 0} reservations for customer ${customerId} (page ${page}/${totalPages})`, { 
    requestId,
    totalCount,
    pageSize: limit
  });
  
  // Prepare response
  const responseData: any = {
    status: 'success',
    results: reservations ? reservations.length : 0,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage,
      hasPrevPage
    },
    data: {
      reservations: reservations || []
    }
  };
  
  // Add warnings if any
  if (warnings.length > 0) {
    responseData.warnings = warnings;
    logger.warn(`Response includes warnings`, { requestId, warningCount: warnings.length });
  }
  
  res.status(200).json(responseData);
});
