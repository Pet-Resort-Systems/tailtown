/**
 * Utility functions that mirror the @tailtown/api package until it's properly integrated
 */

import { Request } from 'express';
import { ZodSchema } from 'zod';

/**
 * Creates a standardized error response for validation errors
 */
export function createValidationError(message: string, details?: Record<string, any>) {
  return {
    type: 'VALIDATION_ERROR',
    message,
    details
  };
}

/**
 * Creates a standardized error response for not found errors
 */
export function createNotFoundError(resource: string, id: string, context?: string) {
  return {
    type: 'NOT_FOUND_ERROR',
    message: `${resource} with id ${id} not found${context ? ` ${context}` : ''}`,
    details: { resource, id }
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message: message || 'Operation successful'
  };
}

/**
 * Validates a request against the given schema
 */
export function validateRequest(
  req: Request,
  schema: { body?: ZodSchema, params?: ZodSchema, query?: ZodSchema }
) {
  const result: any = {};
  
  if (schema.body) {
    const parsed = schema.body.safeParse(req.body);
    if (!parsed.success) {
      throw createValidationError('Invalid request body', parsed.error.format());
    }
    result.body = parsed.data;
  }
  
  if (schema.params) {
    const parsed = schema.params.safeParse(req.params);
    if (!parsed.success) {
      throw createValidationError('Invalid request parameters', parsed.error.format());
    }
    result.params = parsed.data;
  }
  
  if (schema.query) {
    const parsed = schema.query.safeParse(req.query);
    if (!parsed.success) {
      throw createValidationError('Invalid query parameters', parsed.error.format());
    }
    result.query = parsed.data;
  }
  
  return result;
}
