import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { logger } from '../../utils/logger.js';
import { reservationErrorTracker } from '../../utils/reservation-error-tracker.js';

export const route: Router = expressRouter();
/**
 * Get error analytics and statistics
 */
route.use('/analytics', async (_req, res) => {
  try {
    const analytics = reservationErrorTracker.getErrorAnalyticsObject();
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
});
