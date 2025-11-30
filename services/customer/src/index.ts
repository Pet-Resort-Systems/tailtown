/**
 * Customer Service - Main Entry Point
 *
 * IMPORTANT: When modifying this file, follow patterns in:
 * /docs/DEVELOPMENT-BEST-PRACTICES.md
 *
 * Key reminders:
 * - Auth middleware at ROUTE level, not router level (login must be public)
 * - Always set trust proxy when behind nginx
 * - Middleware order matters: tenant extraction → validation → auth
 */

import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { customerRoutes } from "./routes/customer.routes";
import { petRoutes } from "./routes/pet.routes";
import { reservationRoutes } from "./routes/reservation.routes";
import { serviceRoutes } from "./routes/service.routes";
import { resourceRoutes } from "./routes/resource.routes";
import { suiteRoutes } from "./routes/suite.routes";
import { staffRoutes } from "./routes/staff.routes";
import { scheduleRoutes } from "./routes/schedule.routes";
import priceRuleRoutes from "./routes/priceRule.routes";
import couponRoutes from "./routes/coupon.routes";
import availabilityRoutes from "./routes/availability.routes";
import loyaltyRoutes from "./routes/loyalty.routes";
import depositRoutes from "./routes/deposit.routes";
import multiPetRoutes from "./routes/multiPet.routes";
import checklistRoutes from "./routes/checklist.routes";
import invoiceRoutes from "./routes/invoice.routes";
import paymentRoutes from "./routes/payment.routes";
import addonRoutes from "./routes/addon.routes";
// Using fixed analytics routes to avoid schema issues
import analyticsRoutes from "./routes/analytics-fixed.routes";
import tenantRoutes from "./routes/tenant.routes";
import emailRoutes from "./routes/email.routes";
import smsRoutes from "./routes/sms.routes";
import vaccineUploadRoutes from "./routes/vaccine-upload.routes";
import groomerAppointmentRoutes from "./routes/groomerAppointment.routes";
import trainingClassRoutes from "./routes/trainingClass.routes";
import enrollmentRoutes from "./routes/enrollment.routes";
import vaccineRequirementRoutes from "./routes/vaccineRequirement.routes";
import customIconRoutes from "./routes/custom-icons.routes";
import productsRoutes from "./routes/products.routes";
import reportRoutes from "./routes/reports.routes";
import gingrRoutes from "./routes/gingr.routes";
import referenceDataRoutes from "./routes/referenceData.routes";
import messageTemplatesRoutes from "./routes/messageTemplates.routes";
import announcementRoutes from "./routes/announcement.routes";
import superAdminRoutes from "./routes/super-admin.routes";
import businessSettingsRoutes from "./routes/business-settings.routes";
import messagingRoutes from "./routes/messaging.routes";
import waitlistRoutes from "./routes/waitlist.routes";
import reportCardRoutes from "./routes/reportCard.routes";
import daycarePassRoutes from "./routes/daycare-pass.routes";
import auditLogRoutes from "./routes/audit-log.routes";
import { systemRoutes } from "./routes/system.routes";
import { errorHandler } from "./middleware/error.middleware";
import {
  extractTenantContext,
  requireTenant,
} from "./middleware/tenant.middleware";
import {
  enforceHTTPS,
  securityHeaders,
  sanitizeInput,
} from "./middleware/security.middleware";
import {
  authenticate,
  requireTenantAdmin,
  optionalAuth,
} from "./middleware/auth.middleware";
import { requireJsonContentType } from "./middleware/content-type.middleware";
import { monitoring } from "./utils/monitoring";
import { auditMiddleware } from "./utils/auditLog";
import monitoringRoutes from "./routes/monitoring.routes";

// Load environment variables
dotenv.config();

// Initialize the Express application
const app = express();
const PORT = 4004; // Explicitly setting port 4004 for customer service

// Trust proxy - required for rate limiting behind nginx/reverse proxy
app.set("trust proxy", 1);

// Increase HTTP header limits to prevent 431 errors
app.set("etag", false); // Disable ETag generation to reduce header size
app.set("x-powered-by", false); // Remove unnecessary headers

// Request logging middleware
app.use((req, res, next) => {
  // Request logging handled by Morgan middleware
  next();
});

// Middleware
// Security: Enforce HTTPS in production
app.use(enforceHTTPS);

// Security: Add security headers
app.use(securityHeaders);

// Enable gzip compression for all responses
app.use(compression());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "*"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "http://localhost:3003"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
// Enhanced CORS configuration to ensure frontend can connect
// In production, allow all subdomains of canicloud.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:3001"]; // Default for development

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
      "x-api-key",
      "X-API-Key",
      "X-Tenant-Subdomain",
    ],
    credentials: true,
  })
);

// Add OPTIONS handling for preflight requests
app.options("*", cors());

// Serve static files (uploaded photos)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rate limiting to prevent abuse
// Per-tenant rate limiting: each tenant gets their own quota
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each tenant to 1000 requests per windowMs
  message: "Too many requests from your organization, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Key by tenantId to enforce per-tenant limits
  keyGenerator: (req: any) => {
    // Use tenantId if available, otherwise use default (handles IPv6)
    return req.tenantId;
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === "/health",
  // Custom handler for better error messages
  handler: (req: any, res: any) => {
    res.status(429).json({
      status: "error",
      message: "Rate limit exceeded for your organization",
      tenantId: req.tenantId,
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});

// Apply rate limiting to all API routes
app.use("/api/", limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply to auth routes (if they exist)
app.use("/api/auth/login", authLimiter);

// Request body parsing middleware with security limits
// 10mb limit for JSON payloads (prevents DoS attacks)
// Most API requests should be under 1mb; 10mb allows for reasonable file uploads
app.use(
  express.json({
    limit: "10mb",
    strict: true, // Only accept arrays and objects
    verify: (req, res, buf, encoding) => {
      // Verify content length doesn't exceed limit
      if (buf.length > 10 * 1024 * 1024) {
        throw new Error("Request entity too large");
      }
    },
  })
);

// URL-encoded data limit (for form submissions)
app.use(
  express.urlencoded({
    limit: "10mb",
    extended: true,
    parameterLimit: 10000, // Limit number of parameters to prevent parameter pollution
  })
);

// Security: Enforce JSON content-type for API endpoints
app.use("/api/", requireJsonContentType);

// Security: Sanitize user input
app.use(sanitizeInput);

// Use minimal logging in production to reduce overhead
app.use(morgan("tiny"));

// Ensure uploads directory exists and serve static files
const uploadsPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
if (!fs.existsSync(path.join(uploadsPath, "pets"))) {
  fs.mkdirSync(path.join(uploadsPath, "pets"), { recursive: true });
}
// Static file directory configured with minimal headers to prevent 431 errors
app.use(
  "/uploads",
  express.static(uploadsPath, {
    etag: false,
    lastModified: false,
    maxAge: "1d",
    setHeaders: (res) => {
      // Remove unnecessary headers to reduce header size
      res.removeHeader("X-Powered-By");
      res.removeHeader("ETag");
      res.setHeader("Cache-Control", "public, max-age=86400");
    },
  })
);

// Direct file serving endpoint as a fallback with minimal headers
app.get("/pet-image/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsPath, "pets", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  // Send file with minimal headers to prevent 431 errors
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.removeHeader("X-Powered-By");
  res.removeHeader("ETag");
  res.sendFile(filePath, {
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
    lastModified: false,
    etag: false,
  });
});

// Simplified backward compatibility for existing API references
// Using a more efficient approach to reduce header size
app.use("/api/uploads", (req, res, next) => {
  // Extract the path after /api/uploads
  const subPath = req.url;
  const newPath = path.join(uploadsPath, subPath);

  // Check if file exists
  if (fs.existsSync(newPath)) {
    // Set minimal headers to prevent 431 errors
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.removeHeader("X-Powered-By");
    res.removeHeader("ETag");
    return res.sendFile(newPath, {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
      lastModified: false,
      etag: false,
    });
  }

  // If not found, try the next middleware
  next();
});

// Log the contents of the uploads directory
if (fs.existsSync(path.join(uploadsPath, "pets"))) {
  const files = fs.readdirSync(path.join(uploadsPath, "pets"));
  // Upload directory initialized
}

// Add test endpoints
app.get("/test-static", (req, res) => {
  const uploadsDir = path.join(__dirname, "..", "uploads");
  const petsDir = path.join(uploadsDir, "pets");

  if (!fs.existsSync(petsDir)) {
    return res.json({
      error: "Pets directory does not exist",
      uploadsDir,
      petsDir,
    });
  }

  const files = fs.readdirSync(petsDir);
  const fileDetails = files.map((file) => {
    const filePath = path.join(petsDir, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: stats.size,
      created: stats.birthtime,
      fullPath: filePath,
      url: `/uploads/pets/${file}`,
    };
  });

  res.json({
    uploadsDir,
    petsDir,
    files: fileDetails,
  });
});

// Test specific file
app.get("/test-file/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "..", "uploads", "pets", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "File not found",
      filePath,
    });
  }

  const stats = fs.statSync(filePath);
  res.json({
    exists: true,
    size: stats.size,
    created: stats.birthtime,
    fullPath: filePath,
    url: `/uploads/pets/${filename}`,
  });
});

// Routes
// Super Admin routes (no tenant context required - platform management)
app.use("/api/super-admin", superAdminRoutes);

// Tenant management routes (no tenant context required - for super admins)
app.use("/api/tenants", tenantRoutes);

// System Routes (health monitoring, metrics - no tenant context required)
app.use("/api/system", systemRoutes);

// Apply tenant context middleware to all other routes
// This extracts the subdomain and attaches tenant info to the request
app.use("/api", extractTenantContext);

// Monitoring and audit logging (after tenant context is available)
app.use(monitoring.requestTracker());
app.use(auditMiddleware());

// Monitoring routes (accessible without authentication for health checks)
app.use("/monitoring", monitoringRoutes);

// ============================================
// PUBLIC API ROUTES (MUST BE FIRST - no authentication required)
// ============================================
// Customer lookup for booking portal login (public, rate-limited)
import { lookupCustomerByEmail } from "./controllers/customer.controller";

const customerLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 10 : 100, // Higher limit for dev/test
  message: {
    success: false,
    error: "Too many lookup attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post(
  "/api/customers/lookup",
  requireTenant,
  customerLookupLimiter,
  requireJsonContentType,
  lookupCustomerByEmail
);

// Announcement Routes (GET is public, write requires admin - auth handled in routes)
app.use("/api/announcements", requireTenant, announcementRoutes);

// ============================================
// ADMIN-ONLY ROUTES (require admin role)
// ============================================
// Note: Staff routes handle their own auth (login endpoint is public)
app.use("/api/staff", requireTenant, staffRoutes);
app.use(
  "/api/price-rules",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  priceRuleRoutes
);
app.use(
  "/api/coupons",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  couponRoutes
);
app.use(
  "/api/loyalty",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  loyaltyRoutes
);
app.use(
  "/api/analytics",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  analyticsRoutes
);
app.use(
  "/api/emails",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  emailRoutes
);
app.use("/api/sms", requireTenant, authenticate, requireTenantAdmin, smsRoutes);
app.use(
  "/api/reports",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  reportRoutes
);

// Audit Log Routes (admin only - for compliance and security)
app.use(
  "/api/audit-logs",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  auditLogRoutes
);

// ============================================
// STAFF ROUTES (require authentication)
// ============================================
app.use("/api/customers", requireTenant, authenticate, customerRoutes);
app.use("/api/pets", requireTenant, authenticate, petRoutes);
app.use("/api/reservations", requireTenant, authenticate, reservationRoutes);
app.use("/api/services", requireTenant, authenticate, serviceRoutes);
app.use("/api/resources", requireTenant, authenticate, resourceRoutes);
app.use("/api/suites", requireTenant, authenticate, suiteRoutes);
app.use("/api/availability", requireTenant, authenticate, availabilityRoutes);
app.use("/api/deposits", requireTenant, authenticate, depositRoutes);
app.use("/api/multi-pet", requireTenant, authenticate, multiPetRoutes);
app.use("/api/checklists", requireTenant, authenticate, checklistRoutes);
app.use("/api/schedules", requireTenant, authenticate, scheduleRoutes);
app.use("/api/invoices", requireTenant, authenticate, invoiceRoutes);
app.use("/api/payments", requireTenant, authenticate, paymentRoutes);
app.use("/api/addons", requireTenant, authenticate, addonRoutes);
app.use("/api/pets", requireTenant, authenticate, vaccineUploadRoutes);

// Reference Data Routes (breeds, vets, temperaments) - read-only, optional auth
app.use("/api", requireTenant, optionalAuth, referenceDataRoutes);

// ============================================
// AUTHENTICATED ROUTES WITH /api PREFIX
// ============================================
// Advanced Scheduling Routes
app.use("/api", requireTenant, authenticate, groomerAppointmentRoutes);
app.use("/api", requireTenant, authenticate, trainingClassRoutes);
app.use("/api", requireTenant, authenticate, enrollmentRoutes);

// Vaccine Requirement Routes (admin only)
app.use(
  "/api",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  vaccineRequirementRoutes
);

// Custom Icon Routes (admin only)
app.use(
  "/api/custom-icons",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  customIconRoutes
);

// Products & POS Routes
app.use("/api/products", requireTenant, authenticate, productsRoutes);

// Gingr Migration Routes (no tenant required - for super admin)
app.use("/api/gingr", gingrRoutes);

// Message Templates Routes (admin only)
app.use(
  "/api/message-templates",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  messageTemplatesRoutes
);

// Business Settings Routes (admin only)
app.use(
  "/api/business-settings",
  requireTenant,
  authenticate,
  requireTenantAdmin,
  businessSettingsRoutes
);

// Messaging Routes (staff only, authenticated)
app.use("/api/messaging", requireTenant, messagingRoutes);

// Waitlist Routes (authenticated)
app.use("/api/waitlist", requireTenant, waitlistRoutes);

// Report Card Routes (authenticated)
app.use("/api/report-cards", requireTenant, reportCardRoutes);

// Daycare Pass Routes (authenticated)
app.use("/api/daycare-passes", requireTenant, daycarePassRoutes);

// Serve uploaded icons statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Additional routes without /api prefix for staff (to match frontend API calls)
// Note: Staff routes handle their own auth internally
app.use("/staff", staffRoutes);
app.use("/schedules", authenticate, scheduleRoutes);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Simple ping endpoint (no database, no dependencies)
app.get("/ping", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "customer-service",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "unknown",
  });
});

// Debug endpoint to see what headers we're receiving
app.get("/debug-headers", (req, res) => {
  res.status(200).json({
    hostname: req.hostname,
    headers: req.headers,
    url: req.url,
    originalUrl: req.originalUrl,
    protocol: req.protocol,
    secure: req.secure,
    ip: req.ip,
    ips: req.ips,
  });
});

// Health check endpoint with database connectivity test
app.get("/health", async (req, res) => {
  const health: any = {
    status: "up",
    service: "customer-service",
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      error: null,
    },
    tenant: {
      canQuery: false,
      count: 0,
      error: null,
    },
  };

  try {
    // Test database connection
    const { prisma } = await import("./config/prisma");
    await prisma.$queryRaw`SELECT 1`;
    health.database.connected = true;

    // Test Tenant table query
    try {
      const tenantCount = await prisma.tenant.count();
      health.tenant.canQuery = true;
      health.tenant.count = tenantCount;
    } catch (tenantError: any) {
      health.tenant.error = tenantError.message;
    }
  } catch (dbError: any) {
    health.database.error = dbError.message;
    health.status = "degraded";
  }

  res.status(health.status === "up" ? 200 : 503).json(health);
});

// Error handling middleware
app.use(errorHandler);

// Start the server only if not in test mode
if (process.env.NODE_ENV !== "test") {
  // Initialize Sentry error tracking
  import("./utils/sentry").then(({ initSentry }) => {
    initSentry();
  });

  // Initialize Redis cache
  import("./utils/redis").then(({ initRedis }) => {
    initRedis().catch((error) => {
      console.error(
        "Failed to initialize Redis, continuing without cache:",
        error
      );
    });
  });

  app.listen(PORT, () => {
    console.log(`Customer service running on port ${PORT}`);
  });
}

export default app;
