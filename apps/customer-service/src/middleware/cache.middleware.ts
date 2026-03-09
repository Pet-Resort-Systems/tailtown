/**
 * Cache Middleware
 * 
 * Adds HTTP caching headers to responses for static/rarely changing data
 * to reduce server load and improve client-side performance.
 */

import { Request, Response, NextFunction } from 'express';

export interface CacheOptions {
  /**
   * Cache duration in seconds
   */
  maxAge: number;
  
  /**
   * Whether the cache can be shared (public) or is user-specific (private)
   */
  visibility?: 'public' | 'private';
  
  /**
   * Whether the cache must revalidate with the server before using stale data
   */
  mustRevalidate?: boolean;
  
  /**
   * Whether to include ETag for conditional requests
   */
  etag?: boolean;
}

/**
 * Create a cache middleware with specified options
 */
export function cacheMiddleware(options: CacheOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Build Cache-Control header
    const directives: string[] = [];
    
    // Add visibility
    directives.push(options.visibility || 'public');
    
    // Add max-age
    directives.push(`max-age=${options.maxAge}`);
    
    // Add must-revalidate if specified
    if (options.mustRevalidate) {
      directives.push('must-revalidate');
    }
    
    // Set Cache-Control header
    res.set('Cache-Control', directives.join(', '));
    
    // Enable ETag if specified
    if (options.etag !== false) {
      // Express will automatically generate ETags for responses
      // We just need to not disable them
    } else {
      res.set('ETag', '');
    }
    
    next();
  };
}

/**
 * Predefined cache strategies for common use cases
 */
export const CacheStrategies = {
  /**
   * No caching - always fetch fresh data
   */
  noCache: () => cacheMiddleware({
    maxAge: 0,
    visibility: 'private',
    mustRevalidate: true
  }),
  
  /**
   * Short cache (5 minutes) - for frequently changing data
   * Good for: Dashboard stats, recent activity
   */
  short: () => cacheMiddleware({
    maxAge: 300, // 5 minutes
    visibility: 'public',
    mustRevalidate: true
  }),
  
  /**
   * Medium cache (1 hour) - for moderately stable data
   * Good for: Service lists, resource lists, staff lists
   */
  medium: () => cacheMiddleware({
    maxAge: 3600, // 1 hour
    visibility: 'public',
    mustRevalidate: false
  }),
  
  /**
   * Long cache (24 hours) - for rarely changing data
   * Good for: System settings, reference data, static content
   */
  long: () => cacheMiddleware({
    maxAge: 86400, // 24 hours
    visibility: 'public',
    mustRevalidate: false
  }),
  
  /**
   * User-specific cache (5 minutes) - for personalized data
   * Good for: User preferences, customer-specific data
   */
  userSpecific: () => cacheMiddleware({
    maxAge: 300, // 5 minutes
    visibility: 'private',
    mustRevalidate: true
  })
};

/**
 * Middleware to disable caching entirely
 */
export function noCacheMiddleware(req: Request, res: Response, next: NextFunction) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
}
