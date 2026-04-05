import { env } from '../env.js';
/**
 * Enhanced Error Handling Middleware
 *
 * This middleware provides consistent error handling across the application.
 * It handles different types of errors, formats responses appropriately,
 * and provides detailed logging with proper context.
 */

import { type Request, type Response, type NextFunction } from 'express';
import { logger as appLogger } from '../utils/logger.js';
import { captureException, setUser, addBreadcrumb } from '../utils/sentry.js';

/**
 * Standardized error types
 */
export enum ErrorType {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',

  // Special cases
  SCHEMA_ALIGNMENT_ERROR = 'SCHEMA_ALIGNMENT_ERROR',
  MULTI_TENANT_ERROR = 'MULTI_TENANT_ERROR',
}

/**
 * Interface for error context
 */
export interface ErrorContext {
  [key: string]: any;
}

/**
 * AppError class for standardized error handling
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  type: ErrorType;
  details?: any;
  context?: ErrorContext;

  /**
   * Create a new AppError
   *
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param type - Error type from ErrorType enum
   * @param isOperational - Whether this is an operational error (true) or programming error (false)
   * @param details - Additional error details
   * @param context - Contextual information for debugging
   */
  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.SERVER_ERROR,
    isOperational: boolean = true,
    details?: any,
    context?: ErrorContext
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.type = type;
    this.details = details;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a validation error
   */
  static validationError(
    message: string,
    details?: any,
    context?: ErrorContext
  ): AppError {
    return new AppError(
      message,
      400,
      ErrorType.VALIDATION_ERROR,
      true,
      details,
      context
    );
  }

  /**
   * Create an authentication error
   */
  static authenticationError(
    message: string = 'Authentication required',
    context?: ErrorContext
  ): AppError {
    return new AppError(
      message,
      401,
      ErrorType.AUTHENTICATION_ERROR,
      true,
      undefined,
      context
    );
  }

  /**
   * Create an authorization error
   */
  static authorizationError(
    message: string = 'Not authorized',
    context?: ErrorContext
  ): AppError {
    return new AppError(
      message,
      403,
      ErrorType.AUTHORIZATION_ERROR,
      true,
      undefined,
      context
    );
  }

  /**
   * Create a not found error
   */
  static notFoundError(
    resource: string,
    id?: string | number,
    context?: ErrorContext
  ): AppError {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;

    return new AppError(
      message,
      404,
      ErrorType.RESOURCE_NOT_FOUND,
      true,
      { resource, id },
      context
    );
  }

  /**
   * Create a conflict error
   */
  static conflictError(
    message: string,
    details?: any,
    context?: ErrorContext
  ): AppError {
    return new AppError(
      message,
      409,
      ErrorType.RESOURCE_CONFLICT,
      true,
      details,
      context
    );
  }

  /**
   * Create a database error
   */
  static databaseError(
    message: string,
    details?: any,
    isOperational: boolean = true,
    context?: ErrorContext
  ): AppError {
    return new AppError(
      message,
      500,
      ErrorType.DATABASE_ERROR,
      isOperational,
      details,
      context
    );
  }
}

// Use the application logger
const logger = appLogger;

/**
 * Handle Prisma-specific errors
 */
export const handlePrismaError = (err: any): AppError => {
  const errorCode = err.code;
  const meta = err.meta || {};
  const target = meta.target || [];

  switch (errorCode) {
    case 'P2002': // Unique constraint failed
      return AppError.conflictError(
        `Duplicate field value: ${
          Array.isArray(target) ? target.join(', ') : target
        }`,
        { prismaError: errorCode, fields: target }
      );

    case 'P2025': // Record not found
      return AppError.notFoundError(meta.modelName || 'Record', undefined, {
        prismaError: errorCode,
      });

    default:
      return AppError.databaseError(
        'Database operation failed',
        { prismaError: errorCode, meta },
        true
      );
  }
};

/**
 * Format error for development environment
 */
export const sendErrorDev = (err: any, req: Request, res: Response): void => {
  const statusCode = err.statusCode || 500;

  logger.error(`[${req.method}] ${req.path} - ${err.message}`);

  if (err.context) {
    logger.debug(`Error context: ${JSON.stringify(err.context)}`);
  }

  res.status(statusCode).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    error: {
      type: err.type || ErrorType.SERVER_ERROR,
      details: err.details || null,
      stack: err.stack,
      context: err.context || null,
    },
    requestId: req.requestId || null,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Format error for production environment
 */
export const sendErrorProd = (err: any, req: Request, res: Response): void => {
  const statusCode = err.statusCode || 500;

  logger.error(
    `[${req.method}] ${req.path} - ${err.type || 'ERROR'}: ${err.message}`
  );

  if (err.isOperational) {
    res.status(statusCode).json({
      success: false,
      status: err.status || 'error',
      message: err.message,
      error: {
        type: err.type || ErrorType.SERVER_ERROR,
      },
      requestId: req.requestId || null,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.error(
      `Unexpected error: ${JSON.stringify({
        message: err.message,
        stack: err.stack,
        details: err.details || null,
      })}`
    );

    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong',
      error: {
        type: ErrorType.SERVER_ERROR,
      },
      requestId: req.requestId || null,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Main error handler middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (!err.context) {
    err.context = {};
  }

  err.context.requestInfo = {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-request-id': req.requestId,
      'x-organization-id': req.headers['x-organization-id'],
    },
  };

  if (err.code && err.code.startsWith('P')) {
    err = handlePrismaError(err);
  }

  if (err.type === 'entity.parse.failed') {
    err = AppError.validationError('Invalid JSON in request body', {
      syntaxError: err.message,
    });
  }

  if (err.name === 'ValidationError') {
    err = AppError.validationError(err.message, err.details || err.errors);
  }

  // Capture error in Sentry for server errors (5xx)
  if (err.statusCode >= 500) {
    // Set user context if available
    const user = (req as any).user;
    const tenantId = (req as any).tenantId;
    if (user || tenantId) {
      setUser({
        id: user?.id || 'anonymous',
        email: user?.email,
        tenantId,
      });
    }

    // Add request breadcrumb
    addBreadcrumb(`${req.method} ${req.path}`, 'http', {
      url: req.originalUrl,
      method: req.method,
      statusCode: err.statusCode,
      requestId: req.requestId,
    });

    // Capture the exception
    captureException(err, {
      requestId: req.requestId,
      tenantId,
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
      errorType: err.type,
      ...err.context,
    });
  }

  if (env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    sendErrorProd(err, req, res);
  }
};

/**
 * Async error handler wrapper
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
