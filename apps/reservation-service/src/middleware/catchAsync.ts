/**
 * Async Error Handler Middleware
 * 
 * This middleware wraps async controller functions to automatically catch errors
 * and forward them to the Express error handler, eliminating the need for
 * try/catch blocks in each controller.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Controller function type
 */
export type ControllerFunction = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => Promise<any>;

/**
 * Wraps an async controller function and forwards any errors to the next middleware
 * 
 * @param fn - The async controller function to wrap
 * @returns A function that catches any errors and passes them to next()
 */
export const catchAsync = (fn: ControllerFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
