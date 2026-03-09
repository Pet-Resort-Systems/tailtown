import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS
 */
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Skip if HTTPS enforcement is explicitly disabled (for HTTP-only deployments)
  if (process.env.DISABLE_HTTPS_REDIRECT === 'true') {
    return next();
  }

  // Check if request is already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // Redirect to HTTPS
  return res.redirect(301, `https://${req.headers.host}${req.url}`);
};

/**
 * Middleware to add security headers
 * Implements defense-in-depth security headers following OWASP recommendations
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Strict Transport Security - force HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy - don't leak sensitive URLs
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy - disable unnecessary browser features
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  
  // Cross-Origin policies
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Remove server identification
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Middleware to validate API keys for service-to-service communication
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  const validApiKey = process.env.SERVICE_API_KEY;

  // Skip if no API key is configured (development)
  if (!validApiKey) {
    return next();
  }

  // Validate API key
  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'UNAUTHORIZED',
        message: 'Invalid API key'
      }
    });
  }

  next();
};

/**
 * Middleware to sanitize user input
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove potential XSS vectors
        req.query[key] = (req.query[key] as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  });
}
