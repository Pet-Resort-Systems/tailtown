import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { AppError, ErrorType } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import {
  ReservationErrorCategory,
  reservationErrorTracker,
} from '../../utils/reservation-error-tracker.js';

export const route: Router = expressRouter();
/**
 * Get all tracked errors with optional filtering
 */
route.use('/', async (req, res) => {
  try {
    const { category, isResolved, startDate, endDate, limit } = req.query;
    const filters: {
      category?: ReservationErrorCategory;
      isResolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (category) {
      const parsedCategory = category as ReservationErrorCategory;
      if (!Object.values(ReservationErrorCategory).includes(parsedCategory)) {
        throw new AppError(
          'Invalid category format',
          400,
          ErrorType.VALIDATION_ERROR
        );
      }

      filters.category = parsedCategory;
    }

    if (typeof isResolved !== 'undefined') {
      filters.isResolved = isResolved === 'true';
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
      if (Number.isNaN(filters.startDate.getTime())) {
        throw new AppError(
          'Invalid startDate format',
          400,
          ErrorType.VALIDATION_ERROR
        );
      }
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
      if (Number.isNaN(filters.endDate.getTime())) {
        throw new AppError(
          'Invalid endDate format',
          400,
          ErrorType.VALIDATION_ERROR
        );
      }
    }

    let parsedLimit: number | undefined;
    if (limit) {
      parsedLimit = Number.parseInt(limit as string, 10);
      if (Number.isNaN(parsedLimit)) {
        throw new AppError(
          'Invalid limit format',
          400,
          ErrorType.VALIDATION_ERROR
        );
      }
    }

    const errors = await reservationErrorTracker.getErrors(
      filters,
      parsedLimit ?? 100
    );

    logger.info(`Retrieved ${errors.length} tracked errors`);

    res.status(200).json({
      status: 'success',
      results: errors.length,
      data: { errors },
    });
  } catch (error) {
    logger.error(
      `Failed to retrieve errors: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
});
