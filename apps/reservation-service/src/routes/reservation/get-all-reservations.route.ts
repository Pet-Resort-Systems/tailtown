import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { prisma } from '../../config/prisma.js';
import { type ExtendedReservationWhereInput } from '../../types/prisma-extensions.js';
import { safeExecutePrismaQuery } from '../../utils/schemaUtils.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/service.js';

export const route: Router = expressRouter();
/**
 * Get all reservations with pagination and filtering
 * Implements schema alignment strategy with defensive programming
 * Uses standardized error handling pattern
 *
 * @route GET /api/v1/reservations
 * @param {number} req.query.page - Page number for pagination
 * @param {number} req.query.limit - Number of items per page
 * @param {string} req.query.status - Filter by reservation status
 * @param {string} req.query.startDate - Filter by start date
 * @param {string} req.query.endDate - Filter by end date
 * @param {string} req.query.checkInDate - Filter by check-in date (startDate equals this date)
 * @param {string} req.query.customerId - Filter by customer ID
 * @param {string} req.query.petId - Filter by pet ID
 * @param {string} req.query.resourceId - Filter by resource ID
 * @param {string} req.query.suiteType - Filter by suite type
 * @param {string} req.tenantId - The tenant ID (provided by middleware)
 */
route.use('/', async (req, res) => {
  const requestId = `getAll-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  logger.info(`Processing get all reservations request`, {
    requestId,
    query: req.query,
  });

  const tenantId = req.tenantId;
  if (!tenantId) {
    logger.warn(`Missing tenant ID in request`, { requestId });
    throw AppError.authorizationError('Tenant ID is required');
  }

  let page = 1;
  let limit = 10;
  const warnings: string[] = [];

  if (req.query.page) {
    const parsedPage = parseInt(req.query.page as string);
    if (!isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    } else {
      logger.warn(`Invalid page parameter`, {
        requestId,
        page: req.query.page,
      });
      warnings.push(
        `Invalid page parameter: ${req.query.page}, using default: 1`
      );
    }
  }

  if (req.query.limit) {
    const parsedLimit = parseInt(req.query.limit as string);
    if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 500) {
      limit = parsedLimit;
    } else {
      logger.warn(`Invalid limit parameter`, {
        requestId,
        limit: req.query.limit,
      });
      warnings.push(
        `Invalid limit parameter: ${req.query.limit}, using default: 10`
      );
    }
  }

  const skip = (page - 1) * limit;
  const filter: any = {
    tenantId,
  };

  if (req.query.status) {
    const statusValues = (req.query.status as string).split(',');
    if (statusValues.length > 1) {
      filter.status = { in: statusValues };
      logger.info(
        `Filtering by multiple statuses: ${statusValues.join(', ')}`,
        { requestId }
      );
    } else {
      filter.status = req.query.status;
    }
  }

  if (req.query.customerId) {
    filter.customerId = req.query.customerId;
  }

  if (req.query.petId) {
    filter.petId = req.query.petId;
  }

  if (req.query.resourceId) {
    filter.resourceId = req.query.resourceId;
  }

  if (req.query.suiteType) {
    filter.suiteType = req.query.suiteType;
  }

  if (req.query.checkInDate) {
    try {
      const dateStr = req.query.checkInDate as string;
      const timezone = (req.query.timezone as string) || 'America/New_York';
      const [year, month, day] = dateStr
        .split('-')
        .map((num) => parseInt(num, 10));

      const timezoneOffsets: { [key: string]: number } = {
        'America/New_York': -5,
        'America/Chicago': -6,
        'America/Denver': -7,
        'America/Los_Angeles': -8,
        'America/Phoenix': -7,
        'America/Anchorage': -9,
        'Pacific/Honolulu': -10,
        UTC: 0,
      };

      const offsetHours = timezoneOffsets[timezone] || -5;
      const localStartOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const startOfDay = new Date(
        localStartOfDay.getTime() - offsetHours * 60 * 60 * 1000
      );
      const localEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
      const endOfDay = new Date(
        localEndOfDay.getTime() - offsetHours * 60 * 60 * 1000
      );

      if (!isNaN(startOfDay.getTime()) && !isNaN(endOfDay.getTime())) {
        filter.startDate = { gte: startOfDay, lte: endOfDay };
        logger.info(
          `Filtering reservations checking in on date: ${dateStr} in timezone ${timezone} (UTC: ${startOfDay.toISOString()} to ${endOfDay.toISOString()})`,
          { requestId }
        );
      } else {
        logger.warn(`Invalid checkInDate filter`, {
          requestId,
          checkInDate: req.query.checkInDate,
        });
        warnings.push(`Invalid checkInDate filter: ${req.query.checkInDate}`);
      }
    } catch (error) {
      logger.warn(`Error parsing checkInDate filter`, {
        requestId,
        checkInDate: req.query.checkInDate,
        error,
      });
      warnings.push(
        `Error parsing checkInDate filter: ${req.query.checkInDate}`
      );
    }
  }

  let rangeApplied = false;
  if (!req.query.checkInDate && req.query.startDate && req.query.endDate) {
    try {
      const startStr = req.query.startDate as string;
      const endStr = req.query.endDate as string;
      const [sy, sm, sd] = startStr.split('-').map((n) => parseInt(n, 10));
      const [ey, em, ed] = endStr.split('-').map((n) => parseInt(n, 10));

      const startOfRange = new Date(sy, (sm || 1) - 1, sd || 1, 0, 0, 0, 0);
      const endOfRange = new Date(ey, (em || 1) - 1, ed || 1, 23, 59, 59, 999);

      if (!isNaN(startOfRange.getTime()) && !isNaN(endOfRange.getTime())) {
        const andConds = [
          { startDate: { lte: endOfRange } },
          { endDate: { gte: startOfRange } },
        ];
        filter.AND = Array.isArray(filter.AND)
          ? [...filter.AND, ...andConds]
          : andConds;
        rangeApplied = true;
        logger.info(
          `Filtering reservations overlapping range ${startStr} - ${endStr}`,
          { requestId, startOfRange, endOfRange }
        );
      } else {
        logger.warn(`Invalid startDate/endDate range provided`, {
          requestId,
          startDate: req.query.startDate,
          endDate: req.query.endDate,
        });
        warnings.push(
          `Invalid date range: startDate=${req.query.startDate}, endDate=${req.query.endDate}`
        );
      }
    } catch (error) {
      logger.warn(`Error parsing date range`, {
        requestId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        error,
      });
      warnings.push(
        `Error parsing date range: startDate=${req.query.startDate}, endDate=${req.query.endDate}`
      );
    }
  }

  if (!req.query.checkInDate && !rangeApplied) {
    const dateParam = req.query.startDate || req.query.date;
    if (dateParam) {
      try {
        const dateStr = dateParam as string;
        const [year, month, day] = dateStr
          .split('-')
          .map((num) => parseInt(num, 10));
        const timezone = (req.query.timezone as string) || 'America/Denver';
        const timezoneOffsets: { [key: string]: number } = {
          'America/New_York': -5,
          'America/Chicago': -6,
          'America/Denver': -7,
          'America/Los_Angeles': -8,
          'America/Phoenix': -7,
          UTC: 0,
        };
        const offsetHours = timezoneOffsets[timezone] || -7;

        const startOfDay = new Date(
          Date.UTC(year, month - 1, day, -offsetHours, 0, 0, 0)
        );
        const endOfDay = new Date(
          Date.UTC(year, month - 1, day, 23 - offsetHours, 59, 59, 999)
        );

        if (!isNaN(startOfDay.getTime()) && !isNaN(endOfDay.getTime())) {
          filter.startDate = { lte: endOfDay };
          filter.endDate = { gte: startOfDay };
          logger.info(
            `Filtering reservations active on date: ${dateStr} in timezone ${timezone}, UTC range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
            { requestId }
          );
        } else {
          logger.warn(`Invalid date filter format`, { requestId, dateParam });
          warnings.push(
            `Invalid date filter: ${dateParam}, ignoring this filter`
          );
        }
      } catch (error) {
        logger.warn(`Error parsing date filter`, {
          requestId,
          dateParam,
          error,
        });
        warnings.push(
          `Error parsing date filter: ${dateParam}, ignoring this filter`
        );
      }
    }

    if (req.query.endDate) {
      try {
        const endDate = new Date(req.query.endDate as string);
        if (!isNaN(endDate.getTime())) {
          filter.endDate = { lte: endDate };
        } else {
          logger.warn(`Invalid endDate filter`, {
            requestId,
            endDate: req.query.endDate,
          });
          warnings.push(
            `Invalid endDate filter: ${req.query.endDate}, ignoring this filter`
          );
        }
      } catch (error) {
        logger.warn(`Error parsing endDate filter`, {
          requestId,
          endDate: req.query.endDate,
          error,
        });
        warnings.push(
          `Error parsing endDate filter: ${req.query.endDate}, ignoring this filter`
        );
      }
    }
  }

  const allowedSortFields = ['startDate', 'endDate', 'createdAt', 'updatedAt'];
  const sortByParam = (req.query.sortBy as string) || 'startDate';
  const sortField = allowedSortFields.includes(sortByParam)
    ? sortByParam
    : 'startDate';
  const sortOrderParam =
    (req.query.sortOrder as string) === 'asc'
      ? 'asc'
      : (req.query.sortOrder as string) === 'desc'
        ? 'desc'
        : 'desc';
  const orderByClause: any = { [sortField]: sortOrderParam };

  const totalCount = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.count({
        where: filter as ExtendedReservationWhereInput,
      });
    },
    0,
    `Error counting reservations with filter`,
    true
  );

  const reservations = await safeExecutePrismaQuery(
    async () => {
      return await prisma.reservation.findMany({
        where: filter as ExtendedReservationWhereInput,
        skip,
        take: limit,
        orderBy: orderByClause,
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
          staffAssignedId: true,
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
              serviceCategory: true,
            },
          },
        },
      });
    },
    [],
    `Error fetching reservations with filter`,
    true
  );

  const totalPages = Math.ceil((totalCount || 0) / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  logger.info(
    `Found ${reservations ? reservations.length : 0} reservations (page ${page}/${totalPages})`,
    {
      requestId,
      totalCount,
      pageSize: limit,
    }
  );

  const responseData: any = {
    status: 'success',
    results: reservations ? reservations.length : 0,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage,
      hasPrevPage,
    },
    data: {
      reservations: reservations || [],
    },
  };

  if (warnings.length > 0) {
    responseData.warnings = warnings;
    logger.warn(`Response includes warnings`, {
      requestId,
      warningCount: warnings.length,
    });
  }

  res.status(200).json(responseData);
});
