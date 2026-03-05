/**
 * Type declarations for catchAsync middleware
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
export declare function catchAsync(
  fn: ControllerFunction
): (req: Request, res: Response, next: NextFunction) => void;
