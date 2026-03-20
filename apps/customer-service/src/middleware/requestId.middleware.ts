/**
 * Request ID Middleware
 *
 * Adds a unique request ID to every request for distributed tracing.
 * The ID is:
 * - Generated if not present in incoming request
 * - Passed through if already present (from upstream service)
 * - Added to response headers
 * - Available in req.requestId for logging
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Header name for request ID (standard header)
export const REQUEST_ID_HEADER = 'X-Request-ID';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware to add request ID to all requests
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use existing request ID from header or generate new one
  const requestId =
    (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string) || randomUUID();

  // Attach to request object
  req.requestId = requestId;

  // Add to response headers so clients can correlate
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};

/**
 * Get request ID for use in service-to-service calls
 * Returns headers object to spread into axios/fetch config
 */
export const getRequestIdHeaders = (req: Request): Record<string, string> => {
  return {
    [REQUEST_ID_HEADER]: req.requestId || randomUUID(),
  };
};

export default requestIdMiddleware;
