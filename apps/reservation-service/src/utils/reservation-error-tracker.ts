/**
 * Reservation Error Tracking Utility
 *
 * A specialized utility for tracking reservation-specific errors.
 * Provides enhanced error categorization, analytics, and reporting.
 */

import { AppError, ErrorType, ErrorContext } from './appError';
import { logger } from './logger';
import { Request } from 'express';
import { prisma } from '../config/prisma';

/**
 * Reservation error categories
 */
export enum ReservationErrorCategory {
  // Input validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Resource allocation errors
  RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Customer/Pet related errors
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  PET_NOT_FOUND = 'PET_NOT_FOUND',
  CUSTOMER_VALIDATION = 'CUSTOMER_VALIDATION',

  // Date/time errors
  DATE_RANGE_INVALID = 'DATE_RANGE_INVALID',
  DATE_PARSING_ERROR = 'DATE_PARSING_ERROR',
  DATE_CONFLICT = 'DATE_CONFLICT',

  // Business rule errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // Database errors
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_CONSTRAINT_ERROR = 'DB_CONSTRAINT_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',

  // Other
  UNKNOWN = 'UNKNOWN',
}

/**
 * Extended error context for reservations
 */
export interface ReservationErrorContext extends ErrorContext {
  reservationId?: string;
  customerId?: string;
  petId?: string;
  resourceId?: string;
  serviceType?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  requestId?: string;
  requestData?: any;
  errorCategory?: ReservationErrorCategory;
  tenant?: string;
  environment?: string;
}

/**
 * Reservation error tracking interface
 */
export interface ReservationErrorRecord {
  id?: string;
  timestamp: Date;
  message: string;
  errorType: string;
  errorCategory: ReservationErrorCategory;
  statusCode: number;
  context: ReservationErrorContext;
  stack?: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

/**
 * Reservation Error Tracker class
 */
export class ReservationErrorTracker {
  private static instance: ReservationErrorTracker;
  private errorStore: Map<string, ReservationErrorRecord> = new Map();
  private errorAnalytics: Map<ReservationErrorCategory, number> = new Map();
  private isInitialized: boolean = false;
  private isEnabled: boolean = true;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    // Initialize error analytics counters
    Object.values(ReservationErrorCategory).forEach((category) => {
      this.errorAnalytics.set(category as ReservationErrorCategory, 0);
    });

    this.isInitialized = true;
    this.isEnabled = process.env.DISABLE_ERROR_TRACKING !== 'true';

    logger.info('ReservationErrorTracker initialized', {
      isEnabled: this.isEnabled,
      trackingCategories: Object.keys(ReservationErrorCategory).length,
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ReservationErrorTracker {
    if (!ReservationErrorTracker.instance) {
      ReservationErrorTracker.instance = new ReservationErrorTracker();
    }
    return ReservationErrorTracker.instance;
  }

  /**
   * Track a reservation error
   */
  public trackError(
    error: AppError | Error,
    category: ReservationErrorCategory = ReservationErrorCategory.UNKNOWN,
    context: ReservationErrorContext = {}
  ): string | null {
    if (!this.isEnabled) return null;

    // Generate unique error ID
    const errorId = `res-err-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Extract data from AppError if available
    const appError = error instanceof AppError ? error : null;
    const errorType = appError ? appError.type : ErrorType.SERVER_ERROR;
    const statusCode = appError ? appError.statusCode : 500;
    const details = appError ? appError.details : undefined;

    // Add default environment context
    context.environment = process.env.NODE_ENV || 'development';

    // Create error record
    const errorRecord: ReservationErrorRecord = {
      id: errorId,
      timestamp: new Date(),
      message: error.message,
      errorType: errorType.toString(),
      errorCategory: category,
      statusCode,
      context: {
        ...context,
        details,
      },
      stack: error.stack,
      isResolved: false,
    };

    // Store error
    this.errorStore.set(errorId, errorRecord);

    // Update analytics
    this.incrementErrorCount(category);

    // Log error with context
    logger.error(`Reservation error tracked: ${error.message}`, {
      errorId,
      category,
      statusCode,
      context: JSON.stringify(context),
    });

    // Persist error to database if available
    this.persistError(errorRecord).catch((e) => {
      logger.error(`Failed to persist error to database: ${e.message}`);
    });

    return errorId;
  }

  /**
   * Track a reservation error from request context
   */
  public trackErrorFromRequest(
    error: AppError | Error,
    req: Request,
    category?: ReservationErrorCategory
  ): string | null {
    // Extract reservation context from request
    const context: ReservationErrorContext = {
      requestId: req.headers['x-request-id'] as string,
      requestData: {
        body: req.body,
        query: req.query,
        params: req.params,
        path: req.path,
        method: req.method,
      },
      tenant: req['tenantId'] || 'unknown',
      reservationId: req.params.id || req.body.id,
      customerId: req.body.customerId,
      petId: req.body.petId,
      resourceId: req.body.resourceId,
      serviceType: req.body.serviceType,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    };

    // Determine error category if not provided
    if (!category) {
      category = this.determineErrorCategory(error, req);
    }

    // Track the error with context
    const errorId = this.trackError(error, category, context);
    return errorId;
  }

  /**
   * Determine the most likely error category based on the error and request
   */
  private determineErrorCategory(
    error: AppError | Error,
    req: Request
  ): ReservationErrorCategory {
    const appError = error instanceof AppError ? error : null;

    // Check specific error types for AppError
    if (appError) {
      if (appError.type === ErrorType.VALIDATION_ERROR) {
        if (req.body.startDate || req.body.endDate) {
          try {
            new Date(req.body.startDate);
            new Date(req.body.endDate);
          } catch (e) {
            return ReservationErrorCategory.DATE_PARSING_ERROR;
          }

          return ReservationErrorCategory.VALIDATION_ERROR;
        }

        if (req.body.customerId) {
          return ReservationErrorCategory.CUSTOMER_VALIDATION;
        }
      }

      if (appError.type === ErrorType.RESOURCE_NOT_FOUND) {
        if (appError.message.includes('Resource')) {
          return ReservationErrorCategory.RESOURCE_NOT_FOUND;
        }

        if (appError.message.includes('Customer')) {
          return ReservationErrorCategory.CUSTOMER_NOT_FOUND;
        }

        if (appError.message.includes('Pet')) {
          return ReservationErrorCategory.PET_NOT_FOUND;
        }
      }

      if (appError.type === ErrorType.RESOURCE_CONFLICT) {
        return ReservationErrorCategory.RESOURCE_CONFLICT;
      }

      if (appError.type === ErrorType.DATABASE_ERROR) {
        return ReservationErrorCategory.DB_CONSTRAINT_ERROR;
      }

      if (appError.type === ErrorType.SCHEMA_ALIGNMENT_ERROR) {
        return ReservationErrorCategory.SCHEMA_ERROR;
      }
    }

    // Check error message patterns
    if (
      error.message.includes('conflict') ||
      error.message.includes('overlap')
    ) {
      return ReservationErrorCategory.DATE_CONFLICT;
    }

    if (error.message.includes('capacity') || error.message.includes('full')) {
      return ReservationErrorCategory.CAPACITY_EXCEEDED;
    }

    if (error.message.includes('date') || error.message.includes('time')) {
      return ReservationErrorCategory.DATE_RANGE_INVALID;
    }

    return ReservationErrorCategory.UNKNOWN;
  }

  /**
   * Get error record by ID
   */
  public getError(errorId: string): ReservationErrorRecord | undefined {
    return this.errorStore.get(errorId);
  }

  /**
   * Get all errors matching a specific category
   */
  public getErrorsByCategory(
    category: ReservationErrorCategory
  ): ReservationErrorRecord[] {
    const errors: ReservationErrorRecord[] = [];

    this.errorStore.forEach((error) => {
      if (error.errorCategory === category) {
        errors.push(error);
      }
    });

    return errors;
  }

  /**
   * Get all errors with optional filtering criteria
   *
   * @param filters - Object containing filter criteria
   * @param limit - Maximum number of errors to return
   * @returns Array of error records
   */
  public async getErrors(
    filters?: {
      category?: ReservationErrorCategory;
      isResolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<ReservationErrorRecord[]> {
    const result: ReservationErrorRecord[] = [];
    let count = 0;

    // Convert to array and sort by timestamp (newest first)
    const errors = Array.from(this.errorStore.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    // Apply filters
    for (const error of errors) {
      // Stop if we've reached the limit
      if (count >= limit) break;

      // Apply category filter
      if (filters?.category && error.errorCategory !== filters.category) {
        continue;
      }

      // Apply resolution status filter
      if (
        typeof filters?.isResolved === 'boolean' &&
        error.isResolved !== filters.isResolved
      ) {
        continue;
      }

      // Apply date filters
      if (filters?.startDate && error.timestamp < filters.startDate) {
        continue;
      }

      if (filters?.endDate && error.timestamp > filters.endDate) {
        continue;
      }

      result.push(error);
      count++;
    }

    // If database persistence is enabled, fetch errors from there too
    if (process.env.DISABLE_ERROR_PERSISTENCE !== 'true') {
      try {
        // Check if reservation_errors table exists
        const tableExists = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'reservation_errors'
          );
        `;

        if (tableExists) {
          // Build query conditions
          const conditions = [];
          const params = [];

          if (filters?.category) {
            conditions.push(`error_category = $${params.length + 1}`);
            params.push(filters.category);
          }

          if (typeof filters?.isResolved === 'boolean') {
            conditions.push(`is_resolved = $${params.length + 1}`);
            params.push(filters.isResolved);
          }

          if (filters?.startDate) {
            conditions.push(`timestamp >= $${params.length + 1}`);
            params.push(filters.startDate);
          }

          if (filters?.endDate) {
            conditions.push(`timestamp <= $${params.length + 1}`);
            params.push(filters.endDate);
          }

          // Build where clause
          let whereClause = '';
          if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
          }

          // Execute query
          const dbErrors = await prisma.$queryRawUnsafe(
            `
            SELECT 
              id, timestamp, message, error_type, error_category, 
              status_code, context, stack, is_resolved,
              resolved_at, resolved_by, resolution
            FROM reservation_errors
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT $${params.length + 1}
          `,
            ...params,
            limit
          );

          // Add DB errors not already in memory
          const memoryErrorIds = new Set(result.map((e) => e.id));

          for (const dbError of dbErrors as any[]) {
            if (!memoryErrorIds.has(dbError.id)) {
              result.push({
                id: dbError.id,
                timestamp: new Date(dbError.timestamp),
                message: dbError.message,
                errorType: dbError.error_type,
                errorCategory: dbError.error_category,
                statusCode: dbError.status_code,
                context:
                  typeof dbError.context === 'string'
                    ? JSON.parse(dbError.context)
                    : dbError.context,
                stack: dbError.stack,
                isResolved: dbError.is_resolved,
                resolvedAt: dbError.resolved_at
                  ? new Date(dbError.resolved_at)
                  : undefined,
                resolvedBy: dbError.resolved_by,
                resolution: dbError.resolution,
              });
            }
          }

          // Re-sort combined results
          result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

          // Apply limit again if needed
          if (result.length > limit) {
            result.splice(limit);
          }
        }
      } catch (e) {
        logger.error(
          `Failed to fetch errors from database: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
        // Continue with in-memory results only
      }
    }

    return result;
  }

  /**
   * Get error analytics
   */
  public getErrorAnalytics(): Map<ReservationErrorCategory, number> {
    return new Map(this.errorAnalytics);
  }

  /**
   * Get error analytics as a plain object
   */
  public getErrorAnalyticsObject(): Record<string, number> {
    const result: Record<string, number> = {};

    this.errorAnalytics.forEach((count, category) => {
      result[category] = count;
    });

    return result;
  }

  /**
   * Mark an error as resolved
   */
  public resolveError(
    errorId: string,
    resolvedBy: string = 'system',
    resolution?: string
  ): boolean {
    const errorRecord = this.errorStore.get(errorId);

    if (!errorRecord) {
      return false;
    }

    errorRecord.isResolved = true;
    errorRecord.resolvedAt = new Date();
    errorRecord.resolvedBy = resolvedBy;
    errorRecord.resolution = resolution;

    // Update database if available
    this.updateErrorInDatabase(errorRecord).catch((e) => {
      logger.error(`Failed to update error in database: ${e.message}`);
    });

    return true;
  }

  /**
   * Clear all tracked errors (for testing/development)
   */
  public clearErrors(): void {
    this.errorStore.clear();

    Object.values(ReservationErrorCategory).forEach((category) => {
      this.errorAnalytics.set(category as ReservationErrorCategory, 0);
    });

    logger.debug('All tracked errors have been cleared');
  }

  /**
   * Increment error count for a category
   */
  private incrementErrorCount(category: ReservationErrorCategory): void {
    const currentCount = this.errorAnalytics.get(category) || 0;
    this.errorAnalytics.set(category, currentCount + 1);
  }

  /**
   * Persist error to database
   */
  private async persistError(error: ReservationErrorRecord): Promise<void> {
    try {
      // Skip persistence if disabled or error already has database ID
      if (process.env.DISABLE_ERROR_PERSISTENCE === 'true') {
        return;
      }

      // Check if reservation_errors table exists
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'reservation_errors'
        );
      `;

      if (!tableExists) {
        logger.warn(
          'reservation_errors table does not exist, skipping persistence'
        );
        return;
      }

      // Store error in database
      const result = await prisma.$executeRawUnsafe(
        `
        INSERT INTO reservation_errors (
          id, timestamp, message, error_type, error_category, 
          status_code, context, stack, is_resolved
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
      `,
        error.id,
        error.timestamp,
        error.message,
        error.errorType,
        error.errorCategory,
        error.statusCode,
        JSON.stringify(error.context),
        error.stack,
        error.isResolved
      );

      logger.debug(`Error persisted to database: ${error.id}`);
    } catch (e: unknown) {
      // Just log the error, don't throw
      logger.error(
        `Failed to persist error to database: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }

  /**
   * Update error in database
   */
  private async updateErrorInDatabase(
    error: ReservationErrorRecord
  ): Promise<void> {
    try {
      if (process.env.DISABLE_ERROR_PERSISTENCE === 'true') {
        return;
      }

      await prisma.$executeRawUnsafe(
        `
        UPDATE reservation_errors
        SET 
          is_resolved = $1,
          resolved_at = $2,
          resolved_by = $3,
          resolution = $4
        WHERE id = $5
      `,
        error.isResolved,
        error.resolvedAt,
        error.resolvedBy,
        error.resolution,
        error.id
      );

      logger.debug(`Error ${error.id} updated in database`);
    } catch (e: unknown) {
      // Just log the error, don't throw
      logger.error(
        `Failed to update error in database: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }
}

// Export singleton instance
export const reservationErrorTracker = ReservationErrorTracker.getInstance();
