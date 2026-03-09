/**
 * Content-Type Validation Middleware
 * 
 * Enforces strict content-type validation to prevent content-type confusion attacks
 * and ensure API endpoints only accept expected content types.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce JSON content-type for POST/PUT/PATCH requests
 * Returns 415 Unsupported Media Type if content-type is not application/json
 */
export const requireJsonContentType = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only check for methods that typically have a body
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  
  if (!methodsWithBody.includes(req.method)) {
    return next();
  }
  
  // Skip if no body (content-length is 0 or undefined)
  const contentLength = req.headers['content-length'];
  if (!contentLength || contentLength === '0') {
    return next();
  }
  
  const contentType = req.headers['content-type'];
  
  // Check if content-type header exists
  if (!contentType) {
    return res.status(415).json({
      status: 'error',
      message: 'Content-Type header is required',
      code: 'MISSING_CONTENT_TYPE'
    });
  }
  
  // Allow multipart/form-data for file uploads
  const contentTypeLower = contentType.toLowerCase();
  if (contentTypeLower.includes('multipart/form-data')) {
    return next();
  }
  
  // Check if content-type is application/json (allow charset parameter)
  if (!contentTypeLower.includes('application/json')) {
    return res.status(415).json({
      status: 'error',
      message: 'Unsupported Media Type. Expected application/json or multipart/form-data',
      code: 'UNSUPPORTED_MEDIA_TYPE',
      received: contentType
    });
  }
  
  next();
};

/**
 * Middleware to enforce multipart/form-data for file upload endpoints
 */
export const requireMultipartContentType = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const contentType = req.headers['content-type'];
  
  if (!contentType) {
    return res.status(415).json({
      status: 'error',
      message: 'Content-Type header is required',
      code: 'MISSING_CONTENT_TYPE'
    });
  }
  
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return res.status(415).json({
      status: 'error',
      message: 'Unsupported Media Type. Expected multipart/form-data',
      code: 'UNSUPPORTED_MEDIA_TYPE',
      received: contentType
    });
  }
  
  next();
};

/**
 * Middleware to reject requests with suspicious content-types
 * Prevents content-type confusion attacks
 */
export const rejectSuspiciousContentTypes = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const contentType = req.headers['content-type'];
  
  if (!contentType) {
    return next();
  }
  
  const suspicious = [
    'text/html',
    'application/x-www-form-urlencoded', // Unless specifically allowed
    'application/xml',
    'text/xml'
  ];
  
  const contentTypeLower = contentType.toLowerCase();
  
  for (const type of suspicious) {
    if (contentTypeLower.includes(type)) {
      return res.status(415).json({
        status: 'error',
        message: `Content-Type ${type} is not allowed for this endpoint`,
        code: 'FORBIDDEN_CONTENT_TYPE',
        received: contentType
      });
    }
  }
  
  next();
};
