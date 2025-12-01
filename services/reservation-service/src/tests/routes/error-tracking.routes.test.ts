// @ts-nocheck
/**
 * Tests for error-tracking.routes.ts
 *
 * Tests the error tracking API routes.
 */

import express from "express";
import request from "supertest";

// Mock all controller functions
jest.mock("../../controllers/error-tracking", () => ({
  getAllErrors: jest.fn((req, res) =>
    res.json({ status: "success", data: [] })
  ),
  getErrorAnalytics: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  getErrorById: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
  resolveError: jest.fn((req, res) =>
    res.json({ status: "success", data: {} })
  ),
}));

import errorTrackingRoutes from "../../routes/error-tracking.routes";
import {
  getAllErrors,
  getErrorAnalytics,
  getErrorById,
  resolveError,
} from "../../controllers/error-tracking";

describe("Error Tracking Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/errors", errorTrackingRoutes);
  });

  describe("GET /api/errors", () => {
    it("should call getAllErrors controller", async () => {
      await request(app).get("/api/errors");

      expect(getAllErrors).toHaveBeenCalled();
    });

    it("should return success response", async () => {
      const response = await request(app).get("/api/errors");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    });

    it("should pass query parameters", async () => {
      await request(app).get(
        "/api/errors?category=VALIDATION_ERROR&resolved=false"
      );

      expect(getAllErrors).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            category: "VALIDATION_ERROR",
            resolved: "false",
          }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("GET /api/errors/analytics", () => {
    it("should call getErrorAnalytics controller", async () => {
      await request(app).get("/api/errors/analytics");

      expect(getErrorAnalytics).toHaveBeenCalled();
    });

    it("should return success response", async () => {
      const response = await request(app).get("/api/errors/analytics");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    });
  });

  describe("GET /api/errors/:id", () => {
    it("should call getErrorById controller", async () => {
      await request(app).get("/api/errors/err-123");

      expect(getErrorById).toHaveBeenCalled();
    });

    it("should pass error ID in params", async () => {
      await request(app).get("/api/errors/err-456");

      expect(getErrorById).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ id: "err-456" }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("PATCH /api/errors/:id/resolve", () => {
    it("should call resolveError controller", async () => {
      await request(app)
        .patch("/api/errors/err-123/resolve")
        .send({ resolution: "Fixed the issue" });

      expect(resolveError).toHaveBeenCalled();
    });

    it("should pass error ID in params", async () => {
      await request(app)
        .patch("/api/errors/err-789/resolve")
        .send({ resolution: "Resolved" });

      expect(resolveError).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ id: "err-789" }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should pass resolution in body", async () => {
      await request(app)
        .patch("/api/errors/err-123/resolve")
        .send({ resolution: "Bug fixed in commit abc123" });

      expect(resolveError).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            resolution: "Bug fixed in commit abc123",
          }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("Route ordering", () => {
    it("should route /analytics before /:id", async () => {
      await request(app).get("/api/errors/analytics");

      expect(getErrorAnalytics).toHaveBeenCalled();
      expect(getErrorById).not.toHaveBeenCalled();
    });
  });
});
