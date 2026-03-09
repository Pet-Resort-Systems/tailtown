/**
 * Resolve Reservation Error Controller
 * 
 * Provides functionality to mark errors as resolved
 */

import { Request, Response } from 'express';
import { reservationErrorTracker } from '../../utils/reservation-error-tracker';
import { AppError, ErrorType } from '../../utils/appError';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/errorHandler';

/**
 * Mark an error as resolved
 */
export const resolveError = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, resolvedBy } = req.body;
    
    // Validate required fields
    if (!resolution) {
      throw new AppError('Resolution is required', 400, ErrorType.VALIDATION_ERROR);
    }
    
    // Get error from tracker to check if it exists
    const error = await reservationErrorTracker.getError(id);
    
    if (!error) {
      throw new AppError(`Error with ID ${id} not found`, 404, ErrorType.RESOURCE_NOT_FOUND);
    }
    
    if (error.isResolved) {
      throw new AppError(`Error with ID ${id} is already resolved`, 409, ErrorType.RESOURCE_CONFLICT);
    }
    
    // Resolve the error
    await reservationErrorTracker.resolveError(id, resolution, resolvedBy);
    
    logger.info(`Error with ID ${id} marked as resolved`);
    
    // Get the updated error
    const updatedError = await reservationErrorTracker.getError(id);
    
    res.status(200).json({
      status: 'success',
      data: { error: updatedError }
    });
  } catch (error) {
    logger.error(`Failed to resolve error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
});
