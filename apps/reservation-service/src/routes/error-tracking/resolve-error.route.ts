import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { AppError, ErrorType } from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import { reservationErrorTracker } from '../../utils/reservation-error-tracker.js';

export const route: Router = expressRouter();
/**
 * Mark an error as resolved
 */
route.use('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, resolvedBy } = req.body;

    if (!resolution) {
      throw new AppError(
        'Resolution is required',
        400,
        ErrorType.VALIDATION_ERROR
      );
    }

    const error = reservationErrorTracker.getError(id);

    if (!error) {
      throw new AppError(
        `Error with ID ${id} not found`,
        404,
        ErrorType.RESOURCE_NOT_FOUND
      );
    }

    if (error.isResolved) {
      throw new AppError(
        `Error with ID ${id} is already resolved`,
        409,
        ErrorType.RESOURCE_CONFLICT
      );
    }

    const wasResolved = reservationErrorTracker.resolveError(
      id,
      resolvedBy,
      resolution
    );

    if (!wasResolved) {
      throw new AppError(
        `Error with ID ${id} not found`,
        404,
        ErrorType.RESOURCE_NOT_FOUND
      );
    }

    logger.info(`Error with ID ${id} marked as resolved`);

    const updatedError = reservationErrorTracker.getError(id);

    res.status(200).json({
      status: 'success',
      data: { error: updatedError },
    });
  } catch (error) {
    logger.error(
      `Failed to resolve error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
});
