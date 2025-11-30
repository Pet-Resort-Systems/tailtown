/**
 * Local implementation of service utilities that were previously imported from @tailtown/api
 * This provides the core functionality needed for the service to operate independently
 */

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { logger } from "./logger";
import { requestIdMiddleware } from "../middleware/requestId.middleware";

/**
 * Create and configure an Express service with standard middleware
 */
export function createService(options: { name: string; version: string }) {
  const app = express();

  // Request ID middleware - MUST be first to ensure all requests have an ID
  app.use(requestIdMiddleware);

  // Apply standard middleware
  // Enable gzip compression for all responses
  app.use(compression());

  // Rate limiting to prevent abuse
  // Per-tenant rate limiting: each tenant gets their own quota
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each tenant to 1000 requests per windowMs
    message:
      "Too many requests from your organization, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    // Key by tenantId to enforce per-tenant limits
    keyGenerator: (req: any) => {
      // Use tenantId if available, otherwise use default (handles IPv6)
      return req.tenantId;
    },
    skip: (req) => req.path === "/health",
    // Custom handler for better error messages
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        error: {
          type: "RATE_LIMIT_ERROR",
          message: "Rate limit exceeded for your organization",
          tenantId: req.tenantId,
          retryAfter: res.getHeader("Retry-After"),
        },
      });
    },
  });

  app.use("/api/", limiter);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS configuration - allow all subdomains in production
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (process.env.NODE_ENV !== "production") {
          return callback(null, true);
        }

        // In production, allow canicloud.com and all its subdomains
        const allowedDomains = [
          "https://canicloud.com",
          "https://www.canicloud.com",
        ];

        // Check if origin matches canicloud.com or any subdomain
        if (
          allowedDomains.includes(origin) ||
          origin.match(/^https:\/\/[a-z0-9-]+\.canicloud\.com$/)
        ) {
          callback(null, true);
        } else if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-tenant-id",
        "X-Tenant-Subdomain",
      ],
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(morgan("dev"));

  // Add health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "up",
      service: options.name,
      version: options.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Add error handlers method to the Express app
  const appWithErrorHandlers = app as Express & {
    registerErrorHandlers: () => void;
  };

  appWithErrorHandlers.registerErrorHandlers = () => {
    // 404 handler
    app.use((req, res, next) => {
      res.status(404).json({
        success: false,
        error: {
          type: "NOT_FOUND_ERROR",
          message: `Route ${req.method} ${req.path} not found`,
        },
      });
    });

    // Global error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      logger.error(`[${options.name}] Error:`, { error: err });

      // Determine status code based on error type
      let statusCode = 500;
      if (err.type === "VALIDATION_ERROR") statusCode = 400;
      if (err.type === "NOT_FOUND_ERROR") statusCode = 404;
      if (err.type === "UNAUTHORIZED_ERROR") statusCode = 401;
      if (err.type === "FORBIDDEN_ERROR") statusCode = 403;

      res.status(statusCode).json({
        success: false,
        error: {
          type: err.type || "SERVER_ERROR",
          message: err.message || "An unexpected error occurred",
          details: err.details || undefined,
        },
      });
    });
  };

  return appWithErrorHandlers;
}

/**
 * Middleware to validate tenant ID in requests
 * This ensures proper multi-tenant isolation
 * Converts subdomain to UUID if needed
 */
export function tenantMiddleware(options: {
  required: boolean;
  validateTenant?: (tenantId: string) => Promise<boolean>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get tenant ID or subdomain from header
      const tenantIdOrSubdomain = req.headers["x-tenant-id"] as string;

      // Check if tenant ID is required but missing
      if (options.required && !tenantIdOrSubdomain) {
        return res.status(401).json({
          success: false,
          error: {
            type: "UNAUTHORIZED_ERROR",
            message: "Tenant ID is required but was not provided",
          },
        });
      }

      let finalTenantId = tenantIdOrSubdomain;

      // If tenant ID is provided, check if it's a UUID or subdomain
      if (tenantIdOrSubdomain) {
        // Check if it's a UUID
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            tenantIdOrSubdomain
          );

        if (!isUUID) {
          // It's a subdomain, need to convert to UUID
          const { prisma } = require("../config/prisma");
          const tenant = await prisma.tenant.findUnique({
            where: { subdomain: tenantIdOrSubdomain },
            select: { id: true },
          });

          if (!tenant) {
            return res.status(404).json({
              success: false,
              error: {
                type: "NOT_FOUND_ERROR",
                message: `Tenant not found for subdomain: ${tenantIdOrSubdomain}`,
              },
            });
          }

          finalTenantId = tenant.id;
        }

        // Validate tenant if validation function is provided
        if (options.validateTenant) {
          const isValid = await options.validateTenant(finalTenantId);
          if (!isValid) {
            return res.status(403).json({
              success: false,
              error: {
                type: "FORBIDDEN_ERROR",
                message: "Invalid tenant ID",
              },
            });
          }
        }
      }

      // Add UUID tenant ID to request
      if (finalTenantId) {
        (req as any).tenantId = finalTenantId;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Enhanced Error class for application-specific errors
 * Includes factory methods for creating standardized error instances
 */
export class AppError extends Error {
  type: string;
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Map status code to error type
    if (statusCode === 400) this.type = "VALIDATION_ERROR";
    else if (statusCode === 401) this.type = "UNAUTHORIZED_ERROR";
    else if (statusCode === 403) this.type = "FORBIDDEN_ERROR";
    else if (statusCode === 404) this.type = "NOT_FOUND_ERROR";
    else if (statusCode === 409) this.type = "CONFLICT_ERROR";
    else if (statusCode === 422) this.type = "UNPROCESSABLE_ENTITY";
    else this.type = "SERVER_ERROR";

    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a validation error (400)
   * @param message - Error message
   * @param details - Additional error details
   */
  static validationError(message: string, details?: any): AppError {
    return new AppError(message, 400, details, true);
  }

  /**
   * Create an authorization error (401)
   * @param message - Error message
   * @param details - Additional error details
   */
  static authorizationError(message: string, details?: any): AppError {
    return new AppError(message, 401, details, true);
  }

  /**
   * Create a forbidden error (403)
   * @param message - Error message
   * @param details - Additional error details
   */
  static forbiddenError(message: string, details?: any): AppError {
    return new AppError(message, 403, details, true);
  }

  /**
   * Create a not found error (404)
   * @param resource - Resource type that wasn't found
   * @param id - ID of the resource that wasn't found
   * @param details - Additional error details
   */
  static notFoundError(
    resource: string,
    id?: string | number,
    details?: any
  ): AppError {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    return new AppError(message, 404, details, true);
  }

  /**
   * Create a conflict error (409)
   * @param message - Error message
   * @param details - Additional error details
   */
  static conflictError(message: string, details?: any): AppError {
    return new AppError(message, 409, details, true);
  }

  /**
   * Create a database error (500)
   * @param message - Error message
   * @param details - Additional error details
   * @param isOperational - Whether this is an operational error
   */
  static databaseError(
    message: string,
    details?: any,
    isOperational = true
  ): AppError {
    return new AppError(message, 500, details, isOperational);
  }

  /**
   * Create a server error (500)
   * @param message - Error message
   * @param details - Additional error details
   * @param isOperational - Whether this is an operational error
   */
  static serverError(
    message: string,
    details?: any,
    isOperational = true
  ): AppError {
    return new AppError(message, 500, details, isOperational);
  }
}
