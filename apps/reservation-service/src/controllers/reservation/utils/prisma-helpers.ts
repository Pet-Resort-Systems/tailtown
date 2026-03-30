/**
 * Prisma Helper Functions
 *
 * This file contains utility functions for working with Prisma safely,
 * implementing the schema alignment strategy with defensive programming.
 */

import { AppError } from '../../../utils/service.js';
import { logger } from '../../../utils/logger.js';

// Re-export centralized prisma client
export { prisma } from '../../../config/prisma.js';

/**
 * Safely executes a Prisma query with error handling
 *
 * @param queryFn - The Prisma query function to execute
 * @param fallbackValue - Value to return if the query fails
 * @param errorMessage - Error message to log if the query fails
 * @param throwError - Whether to throw an AppError on failure (default: false)
 * @returns The query result or fallbackValue
 */
export async function safeExecutePrismaQuery<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T | null = null,
  errorMessage = 'Error executing database query',
  throwError = false
): Promise<T | null> {
  try {
    return await queryFn();
  } catch (error: any) {
    // Extract Prisma error code if available
    const prismaError = error?.code || '';
    const target = error?.meta?.target || '';

    // Log the error with context
    logger.error(`${errorMessage}: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      prismaError,
      target,
    });

    // If throwError is true, convert to appropriate AppError
    if (throwError) {
      if (prismaError === 'P2025') {
        throw AppError.notFoundError(`Record not found: ${target}`);
      } else if (prismaError === 'P2002') {
        throw AppError.conflictError(
          `Duplicate entry for unique field: ${target}`
        );
      } else {
        throw AppError.databaseError(errorMessage, error);
      }
    }

    return fallbackValue;
  }
}
