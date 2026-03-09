/**
 * Validation Middleware
 * 
 * Provides middleware for validating request data using Zod schemas
 * Returns 400 Bad Request with detailed error messages on validation failure
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation target type
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Create validation middleware for a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, query, or params)
 * @returns Express middleware function
 */
export const validate = (
  schema: ZodSchema,
  target: ValidationTarget = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the data to validate based on target
      const dataToValidate = req[target];
      
      // Validate and parse the data
      const validatedData = await schema.parseAsync(dataToValidate);
      
      // Replace the original data with validated/transformed data
      req[target] = validatedData as any;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a user-friendly response
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors
        });
      }
      
      // Pass other errors to error handler
      next(error);
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');

/**
 * Validate route parameters
 */
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

/**
 * Combine multiple validation schemas
 * Useful for validating multiple parts of the request
 */
export const validateRequest = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: any[] = [];
      
      // Validate body if schema provided
      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.issues.map((err) => ({
              target: 'body',
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            })));
          }
        }
      }
      
      // Validate query if schema provided
      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query) as any;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.issues.map((err) => ({
              target: 'query',
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            })));
          }
        }
      }
      
      // Validate params if schema provided
      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params) as any;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.issues.map((err) => ({
              target: 'params',
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            })));
          }
        }
      }
      
      // If there are validation errors, return 400
      if (errors.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
