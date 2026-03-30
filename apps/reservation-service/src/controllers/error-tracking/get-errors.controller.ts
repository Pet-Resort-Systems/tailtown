/**
 * Get Reservation Errors Controller
 *
 * Provides endpoints to retrieve tracked errors and analytics
 */

import { type Request, type Response } from 'express';
import { reservationErrorTracker } from '../../utils/reservation-error-tracker.js';
import { AppError, ErrorType } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * Get all tracked errors with optional filtering
 */
export const getAllErrors = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { category, isResolved, startDate, endDate, limit } = req.query;

      // Parse filters
      const filters: any = {};
      if (category) filters.category = category as string;
      if (isResolved) filters.isResolved = isResolved === 'true';

      // Parse dates if provided
      if (startDate) {
        filters.startDate = new Date(startDate as string);
        if (isNaN(filters.startDate.getTime())) {
          throw new AppError(
            'Invalid startDate format',
            400,
            ErrorType.VALIDATION_ERROR
          );
        }
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
        if (isNaN(filters.endDate.getTime())) {
          throw new AppError(
            'Invalid endDate format',
            400,
            ErrorType.VALIDATION_ERROR
          );
        }
      }

      // Parse limit if provided
      let parsedLimit: number | undefined;
      if (limit) {
        parsedLimit = parseInt(limit as string, 10);
        if (isNaN(parsedLimit)) {
          throw new AppError(
            'Invalid limit format',
            400,
            ErrorType.VALIDATION_ERROR
          );
        }
      }

      // Get errors from tracker
      const errors = await reservationErrorTracker.getErrors(
        filters,
        parsedLimit
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
  }
);

/**
 * Get error analytics and statistics
 */
export const getErrorAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Get analytics from tracker
      const analytics = reservationErrorTracker.getErrorAnalytics();

      // Calculate totals
      const totalErrors = Object.values(analytics).reduce(
        (sum, count) => sum + count,
        0
      );

      logger.info(`Retrieved error analytics with ${totalErrors} total errors`);

      res.status(200).json({
        status: 'success',
        data: {
          analytics,
          totalErrors,
        },
      });
    } catch (error) {
      logger.error(
        `Failed to retrieve error analytics: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
);

/**
 * Get a specific error by ID
 */
export const getErrorById = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get error from tracker
      const error = await reservationErrorTracker.getError(id);

      if (!error) {
        throw new AppError(
          `Error with ID ${id} not found`,
          404,
          ErrorType.RESOURCE_NOT_FOUND
        );
      }

      logger.info(`Retrieved error with ID ${id}`);

      res.status(200).json({
        status: 'success',
        data: { error },
      });
    } catch (error) {
      logger.error(
        `Failed to retrieve error by ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
);
