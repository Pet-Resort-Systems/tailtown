/**
 * Shared Error Handler Middleware
 * 
 * This middleware provides consistent error handling across all services.
 * It handles different types of errors, formats responses appropriately,
 * and provides detailed logging with proper context.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from './AppError';

// Simple console logger for the error handler
// Services should replace this with their own logger implementation
const logger = {
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
  success: (message: string, ...args: any[]) => console.info(`[SUCCESS] ${message}`, ...args)
};

/**
 * Handle Prisma-specific errors
 * 
 * @param err - The error object
 * @returns Transformed AppError
 */
export const handlePrismaError = (err: any): AppError => {
  // Extract useful information from Prisma error
  const errorCode = err.code;
  const meta = err.meta || {};
  const target = meta.target || [];
  
  // Map Prisma error codes to our standardized errors
  switch (errorCode) {
    case 'P2002': // Unique constraint failed
      return AppError.conflictError(
        `Duplicate field value: ${Array.isArray(target) ? target.join(', ') : target}`,
        { prismaError: errorCode, fields: target }
      );
      
    case 'P2025': // Record not found
      return AppError.notFoundError(
        meta.modelName || 'Record',
        undefined,
        { prismaError: errorCode }
      );
      
    case 'P2003': // Foreign key constraint failed
      return AppError.validationError(
        'Foreign key constraint failed',
        { prismaError: errorCode, field: meta.field_name },
      );
      
    case 'P2010': // Raw query failed
      return AppError.databaseError(
        'Database query failed',
        { prismaError: errorCode, query: meta.query },
        true
      );
      
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
 * 
 * @param err - The error object
 * @param req - Express request object
 * @param res - Express response object
 */
export const sendErrorDev = (err: any, req: Request, res: Response): void => {
  const statusCode = err.statusCode || 500;
  
  // Log detailed error information
  logger.error(`[${req.method}] ${req.path} - ${err.message}`);
  
  if (err.context) {
    logger.debug(`Error context: ${JSON.stringify(err.context)}`);
  }
  
  // Send detailed error response
  res.status(statusCode).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    error: {
      type: err.type || ErrorType.SERVER_ERROR,
      details: err.details || null,
      stack: err.stack,
      context: err.context || null
    },
    requestId: req.headers['x-request-id'] || null,
    timestamp: new Date().toISOString()
  });
};

/**
 * Format error for production environment
 * 
 * @param err - The error object
 * @param req - Express request object
 * @param res - Express response object
 */
export const sendErrorProd = (err: any, req: Request, res: Response): void => {
  const statusCode = err.statusCode || 500;
  
  // Log error with request information
  logger.error(`[${req.method}] ${req.path} - ${err.type || 'ERROR'}: ${err.message}`);
  
  // For operational errors, send message to client
  if (err.isOperational) {
    res.status(statusCode).json({
      success: false,
      status: err.status || 'error',
      message: err.message,
      error: {
        type: err.type || ErrorType.SERVER_ERROR
      },
      requestId: req.headers['x-request-id'] || null,
      timestamp: new Date().toISOString()
    });
  } 
  // For programming or unknown errors, send generic message
  else {
    // Log full error details for debugging
    logger.error(`Unexpected error: ${JSON.stringify({
      message: err.message,
      stack: err.stack,
      details: err.details || null,
      context: err.context || null
    })}`);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong',
      error: {
        type: ErrorType.SERVER_ERROR
      },
      requestId: req.headers['x-request-id'] || null,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Main error handler middleware
 * 
 * @param err - The error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Set default error properties
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Add request context to error
  if (!err.context) {
    err.context = {};
  }
  
  // Add request information to context
  err.context.requestInfo = {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-request-id': req.headers['x-request-id'],
      'x-organization-id': req.headers['x-organization-id']
    }
  };
  
  // Handle Prisma database errors
  if (err.code && err.code.startsWith('P')) {
    err = handlePrismaError(err);
  }
  
  // Handle JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    err = AppError.validationError(
      'Invalid JSON in request body',
      { syntaxError: err.message }
    );
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    err = AppError.validationError(
      err.message,
      err.details || err.errors
    );
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    err = AppError.authenticationError('Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    err = AppError.authenticationError('Token expired');
  }
  
  // Different error handling based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    sendErrorProd(err, req, res);
  }
};

/**
 * Async error handler wrapper
 * 
 * Wraps async controller functions to catch errors and pass them to the error handler
 * 
 * @param fn - Async controller function
 * @returns Express middleware function
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
