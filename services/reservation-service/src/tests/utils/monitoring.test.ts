// @ts-nocheck
/**
 * Tests for monitoring.ts
 *
 * Tests the monitoring and metrics utility for tracking system health.
 */

import { Request, Response, NextFunction } from "express";

// Mock logger
jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { monitoring } from "../../utils/monitoring";
import { logger } from "../../utils/logger";

describe("Monitoring utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    monitoring.reset();
  });

  describe("recordRateLimitHit", () => {
    it("should increment rate limit hits", () => {
      monitoring.recordRateLimitHit("tenant-1");
      monitoring.recordRateLimitHit("tenant-1");
      monitoring.recordRateLimitHit("tenant-2");

      const metrics = monitoring.getMetrics();

      expect(metrics.rateLimits.hits).toBe(3);
      expect(metrics.rateLimits.byTenant["tenant-1"]).toBe(2);
      expect(metrics.rateLimits.byTenant["tenant-2"]).toBe(1);
    });

    it("should log warning for rate limit hit", () => {
      monitoring.recordRateLimitHit("tenant-123");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Rate limit hit")
      );
    });
  });

  describe("recordError", () => {
    it("should increment error count", () => {
      monitoring.recordError("HTTP 500", "tenant-1");
      monitoring.recordError("HTTP 400", "tenant-1");
      monitoring.recordError("HTTP 500", "tenant-2");

      const metrics = monitoring.getMetrics();

      expect(metrics.errors.total).toBe(3);
      expect(metrics.errors.byType["HTTP 500"]).toBe(2);
      expect(metrics.errors.byType["HTTP 400"]).toBe(1);
    });

    it("should track recent errors", () => {
      monitoring.recordError("Test error", "tenant-1");

      const metrics = monitoring.getMetrics();

      expect(metrics.errors.recent.length).toBeGreaterThan(0);
      expect(metrics.errors.recent[0].error).toBe("Test error");
      expect(metrics.errors.recent[0].tenant).toBe("tenant-1");
    });

    it("should limit recent errors to MAX_RECENT_ERRORS", () => {
      // Record more than 100 errors
      for (let i = 0; i < 110; i++) {
        monitoring.recordError(`Error ${i}`, "tenant-1");
      }

      const metrics = monitoring.getMetrics();

      // Should only show last 10 in the response (slice(-10))
      expect(metrics.errors.recent.length).toBeLessThanOrEqual(10);
    });
  });

  describe("recordDatabaseQuery", () => {
    it("should increment query count", () => {
      monitoring.recordDatabaseQuery(50);
      monitoring.recordDatabaseQuery(30);
      monitoring.recordDatabaseQuery(20);

      const metrics = monitoring.getMetrics();

      expect(metrics.database.queries).toBe(3);
    });

    it("should track slow queries (>100ms)", () => {
      monitoring.recordDatabaseQuery(50);
      monitoring.recordDatabaseQuery(150);
      monitoring.recordDatabaseQuery(200);

      const metrics = monitoring.getMetrics();

      expect(metrics.database.slowQueries).toBe(2);
    });

    it("should log warning for slow queries", () => {
      monitoring.recordDatabaseQuery(150);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Slow query")
      );
    });
  });

  describe("recordDatabaseError", () => {
    it("should increment database error count", () => {
      monitoring.recordDatabaseError(new Error("Connection failed"));
      monitoring.recordDatabaseError(new Error("Timeout"));

      const metrics = monitoring.getMetrics();

      expect(metrics.database.errors).toBe(2);
    });

    it("should also record as general error", () => {
      monitoring.recordDatabaseError(new Error("Connection failed"));

      const metrics = monitoring.getMetrics();

      expect(metrics.errors.total).toBe(1);
      expect(metrics.errors.byType["DB: Connection failed"]).toBe(1);
    });
  });

  describe("getMetrics", () => {
    it("should return all metrics", () => {
      const metrics = monitoring.getMetrics();

      expect(metrics).toHaveProperty("requests");
      expect(metrics).toHaveProperty("rateLimits");
      expect(metrics).toHaveProperty("responseTimes");
      expect(metrics).toHaveProperty("errors");
      expect(metrics).toHaveProperty("database");
      expect(metrics).toHaveProperty("health");
    });

    it("should convert Maps to objects", () => {
      monitoring.recordRateLimitHit("tenant-1");

      const metrics = monitoring.getMetrics();

      expect(typeof metrics.rateLimits.byTenant).toBe("object");
      expect(metrics.rateLimits.byTenant["tenant-1"]).toBe(1);
    });
  });

  describe("health status", () => {
    it("should return healthy when no issues", () => {
      const metrics = monitoring.getMetrics();

      expect(metrics.health.status).toBe("healthy");
      expect(metrics.health.issues).toHaveLength(0);
    });

    it("should return degraded with high error rate", () => {
      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        monitoring.recordError("HTTP 500");
      }

      const metrics = monitoring.getMetrics();

      // With only errors and no successful requests, error rate is 100%
      expect(metrics.health.status).toBe("degraded");
      expect(metrics.health.issues.some((i) => i.includes("error rate"))).toBe(
        true
      );
    });
  });

  describe("checkAlerts", () => {
    it("should return empty array when healthy", () => {
      const alerts = monitoring.checkAlerts();

      expect(alerts).toHaveLength(0);
    });

    it("should return critical alert for high error rate (>10%)", () => {
      // Simulate 100% error rate
      for (let i = 0; i < 20; i++) {
        monitoring.recordError("HTTP 500");
      }

      const alerts = monitoring.checkAlerts();

      expect(alerts.some((a) => a.type === "high_error_rate")).toBe(true);
      expect(alerts.find((a) => a.type === "high_error_rate")?.severity).toBe(
        "critical"
      );
    });

    it("should return warning alert for slow queries", () => {
      // Simulate high slow query rate
      for (let i = 0; i < 5; i++) {
        monitoring.recordDatabaseQuery(50); // Fast
      }
      for (let i = 0; i < 5; i++) {
        monitoring.recordDatabaseQuery(150); // Slow
      }

      const alerts = monitoring.checkAlerts();

      // 50% slow query rate should trigger alert
      expect(alerts.some((a) => a.type === "slow_queries")).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset all metrics", () => {
      monitoring.recordRateLimitHit("tenant-1");
      monitoring.recordError("HTTP 500");
      monitoring.recordDatabaseQuery(100);

      monitoring.reset();

      const metrics = monitoring.getMetrics();

      expect(metrics.requests.total).toBe(0);
      expect(metrics.rateLimits.hits).toBe(0);
      expect(metrics.errors.total).toBe(0);
      expect(metrics.database.queries).toBe(0);
    });
  });

  describe("requestTracker middleware", () => {
    it("should return a middleware function", () => {
      const middleware = monitoring.requestTracker();

      expect(typeof middleware).toBe("function");
    });

    it("should call next()", () => {
      const middleware = monitoring.requestTracker();
      const mockReq = {
        method: "GET",
        path: "/api/test",
        tenantId: "tenant-1",
      } as unknown as Request;
      const mockRes = {
        on: jest.fn(),
        statusCode: 200,
      } as unknown as Response;
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should increment request count", () => {
      const middleware = monitoring.requestTracker();
      const mockReq = {
        method: "GET",
        path: "/api/test",
        tenantId: "tenant-1",
      } as unknown as Request;
      const mockRes = {
        on: jest.fn(),
        statusCode: 200,
      } as unknown as Response;

      middleware(mockReq, mockRes, jest.fn());

      const metrics = monitoring.getMetrics();
      expect(metrics.requests.total).toBe(1);
    });

    it("should track requests by tenant", () => {
      const middleware = monitoring.requestTracker();
      const mockReq = {
        method: "GET",
        path: "/api/test",
        tenantId: "tenant-123",
      } as unknown as Request;
      const mockRes = {
        on: jest.fn(),
        statusCode: 200,
      } as unknown as Response;

      middleware(mockReq, mockRes, jest.fn());

      const metrics = monitoring.getMetrics();
      expect(metrics.requests.byTenant["tenant-123"]).toBe(1);
    });

    it("should track requests by endpoint", () => {
      const middleware = monitoring.requestTracker();
      const mockReq = {
        method: "POST",
        path: "/api/reservations",
        tenantId: "tenant-1",
      } as unknown as Request;
      const mockRes = {
        on: jest.fn(),
        statusCode: 201,
      } as unknown as Response;

      middleware(mockReq, mockRes, jest.fn());

      const metrics = monitoring.getMetrics();
      expect(metrics.requests.byEndpoint["POST /api/reservations"]).toBe(1);
    });

    it("should use 'unknown' for missing tenantId", () => {
      const middleware = monitoring.requestTracker();
      const mockReq = {
        method: "GET",
        path: "/api/test",
      } as unknown as Request;
      const mockRes = {
        on: jest.fn(),
        statusCode: 200,
      } as unknown as Response;

      middleware(mockReq, mockRes, jest.fn());

      const metrics = monitoring.getMetrics();
      expect(metrics.requests.byTenant["unknown"]).toBe(1);
    });
  });
});
