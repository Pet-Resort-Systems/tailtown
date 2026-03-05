import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login endpoint
 * Prevents brute force attacks by limiting login attempts
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for password reset requests
 * Prevents abuse of password reset functionality
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    status: 'error',
    message: 'Too many password reset requests from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Prevents API abuse
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Per-tenant API rate limiter
 * Prevents one tenant from consuming all API quota
 * Each tenant gets their own rate limit bucket
 */
export const perTenantRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each tenant to 1000 requests per windowMs
  message: {
    status: 'error',
    message: 'Your organization has exceeded the rate limit. Please try again later or contact support for a higher limit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by tenantId instead of IP
  keyGenerator: (req: any) => {
    // Use tenantId from request (set by tenant middleware)
    return req.tenantId || 'unknown';
  },
  // Custom handler for rate limit exceeded
  handler: (req: any, res: any) => {
    res.status(429).json({
      status: 'error',
      message: 'Rate limit exceeded for your organization',
      tenantId: req.tenantId,
      retryAfter: res.getHeader('Retry-After')
    });
  },
});
