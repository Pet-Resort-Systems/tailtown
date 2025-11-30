// @ts-nocheck
/**
 * Tests for monitoring.routes.ts
 *
 * Tests the monitoring API routes.
 */

import express from "express";
import request from "supertest";

// Mock monitoring utility
jest.mock("../../utils/monitoring", () => ({
  monitoring: {
    getMetrics: jest.fn(() => ({
      requests: {
        total: 1000,
        byTenant: { "tenant-1": 500, "tenant-2": 500 },
        byEndpoint: { "GET /api/reservations": 300 },
        byStatus: { 200: 800, 400: 100, 500: 100 },
      },
      rateLimits: {
        hits: 10,
        byTenant: { "tenant-1": 5 },
      },
      responseTimes: {
        p50: 50,
        p95: 200,
        p99: 500,
        avg: 75,
        samples: 1000,
      },
      errors: {
        total: 100,
        byType: { "HTTP 500": 50, "HTTP 400": 50 },
        recent: [
          { timestamp: new Date(), error: "Test error", tenant: "tenant-1" },
        ],
      },
      database: {
        queries: 5000,
        slowQueries: 50,
        errors: 5,
      },
      health: {
        status: "healthy",
        issues: [],
      },
    })),
    checkAlerts: jest.fn(() => []),
    reset: jest.fn(),
  },
}));

import monitoringRoutes from "../../routes/monitoring.routes";
import { monitoring } from "../../utils/monitoring";

describe("Monitoring Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/monitoring", monitoringRoutes);
  });

  describe("GET /monitoring/metrics", () => {
    it("should return metrics", async () => {
      const response = await request(app).get("/monitoring/metrics");

      expect(response.status).toBe(200);
      expect(monitoring.getMetrics).toHaveBeenCalled();
    });

    it("should include request metrics", async () => {
      const response = await request(app).get("/monitoring/metrics");

      expect(response.body.requests).toBeDefined();
      expect(response.body.requests.total).toBe(1000);
    });

    it("should include response time metrics", async () => {
      const response = await request(app).get("/monitoring/metrics");

      expect(response.body.responseTimes).toBeDefined();
      expect(response.body.responseTimes.p95).toBe(200);
    });

    it("should include error metrics", async () => {
      const response = await request(app).get("/monitoring/metrics");

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.total).toBe(100);
    });

    it("should include database metrics", async () => {
      const response = await request(app).get("/monitoring/metrics");

      expect(response.body.database).toBeDefined();
      expect(response.body.database.queries).toBe(5000);
    });

    it("should include health status", async () => {
      const response = await request(app).get("/monitoring/metrics");

      expect(response.body.health).toBeDefined();
      expect(response.body.health.status).toBe("healthy");
    });

    it("should handle errors gracefully", async () => {
      (monitoring.getMetrics as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Metrics error");
      });

      const response = await request(app).get("/monitoring/metrics");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to retrieve metrics");
    });
  });

  describe("GET /monitoring/health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/monitoring/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/monitoring/health");

      expect(response.body.timestamp).toBeDefined();
    });

    it("should include uptime", async () => {
      const response = await request(app).get("/monitoring/health");

      expect(response.body.uptime).toBeDefined();
    });

    it("should include memory usage", async () => {
      const response = await request(app).get("/monitoring/health");

      expect(response.body.memory).toBeDefined();
    });

    it("should handle errors gracefully", async () => {
      (monitoring.getMetrics as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Health error");
      });

      const response = await request(app).get("/monitoring/health");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to retrieve health status");
    });
  });

  describe("GET /monitoring/alerts", () => {
    it("should return alerts", async () => {
      const response = await request(app).get("/monitoring/alerts");

      expect(response.status).toBe(200);
      expect(monitoring.checkAlerts).toHaveBeenCalled();
    });

    it("should include alert count", async () => {
      const response = await request(app).get("/monitoring/alerts");

      expect(response.body.count).toBe(0);
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/monitoring/alerts");

      expect(response.body.timestamp).toBeDefined();
    });

    it("should return alerts when present", async () => {
      (monitoring.checkAlerts as jest.Mock).mockReturnValueOnce([
        {
          type: "high_error_rate",
          message: "Error rate is 15%",
          severity: "critical",
        },
      ]);

      const response = await request(app).get("/monitoring/alerts");

      expect(response.body.count).toBe(1);
      expect(response.body.alerts[0].type).toBe("high_error_rate");
    });

    it("should handle errors gracefully", async () => {
      (monitoring.checkAlerts as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Alerts error");
      });

      const response = await request(app).get("/monitoring/alerts");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to retrieve alerts");
    });
  });

  describe("GET /monitoring/dashboard", () => {
    it("should return HTML dashboard", async () => {
      const response = await request(app).get("/monitoring/dashboard");

      expect(response.status).toBe(200);
      expect(response.type).toBe("text/html");
    });

    it("should include dashboard title", async () => {
      const response = await request(app).get("/monitoring/dashboard");

      expect(response.text).toContain("Tailtown Monitoring Dashboard");
    });

    it("should include metrics data", async () => {
      const response = await request(app).get("/monitoring/dashboard");

      expect(response.text).toContain("Total Requests");
      expect(response.text).toContain("Error Rate");
      expect(response.text).toContain("Response Time");
    });
  });

  describe("POST /monitoring/reset", () => {
    it("should reset metrics in non-production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const response = await request(app).post("/monitoring/reset");

      expect(response.status).toBe(200);
      expect(monitoring.reset).toHaveBeenCalled();
      expect(response.body.message).toBe("Metrics reset successfully");

      process.env.NODE_ENV = originalEnv;
    });

    it("should reject reset in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const response = await request(app).post("/monitoring/reset");

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot reset metrics in production");
      expect(monitoring.reset).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
