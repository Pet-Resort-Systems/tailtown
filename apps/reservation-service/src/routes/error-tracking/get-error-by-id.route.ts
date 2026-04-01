import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { AppError, ErrorType } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import { reservationErrorTracker } from '../../utils/reservation-error-tracker.js';

export const route: Router = expressRouter();
/**
 * Get a specific error by ID
 */
route.use('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const error = reservationErrorTracker.getError(id);

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
});
