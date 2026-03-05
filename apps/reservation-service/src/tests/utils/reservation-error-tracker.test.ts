// @ts-nocheck
/**
 * Tests for reservation-error-tracker.ts
 *
 * Tests the specialized error tracking utility for reservation-specific errors.
 */

import { Request } from "express";

// Mock dependencies
jest.mock("../../config/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  },
}));

jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import {
  ReservationErrorTracker,
  ReservationErrorCategory,
  ReservationErrorContext,
} from "../../utils/reservation-error-tracker";
import { AppError, ErrorType } from "../../utils/appError";
import { logger } from "../../utils/logger";

describe("ReservationErrorTracker", () => {
  let tracker: ReservationErrorTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get fresh instance and clear any existing errors
    tracker = ReservationErrorTracker.getInstance();
    tracker.clearErrors();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = ReservationErrorTracker.getInstance();
      const instance2 = ReservationErrorTracker.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("trackError", () => {
    it("should track an AppError and return error ID", () => {
      const error = new AppError("Test error", 400, ErrorType.VALIDATION_ERROR);

      const errorId = tracker.trackError(
        error,
        ReservationErrorCategory.VALIDATION_ERROR
      );

      expect(errorId).toBeTruthy();
      expect(errorId).toMatch(/^res-err-/);
    });

    it("should track a regular Error", () => {
      const error = new Error("Regular error");

      const errorId = tracker.trackError(error);

      expect(errorId).toBeTruthy();
    });

    it("should store error with correct properties", () => {
      const error = new AppError(
        "Validation failed",
        400,
        ErrorType.VALIDATION_ERROR
      );
      const context: ReservationErrorContext = {
        reservationId: "res-123",
        customerId: "cust-456",
      };

      const errorId = tracker.trackError(
        error,
        ReservationErrorCategory.VALIDATION_ERROR,
        context
      );

      const storedError = tracker.getError(errorId!);

      expect(storedError).toBeDefined();
      expect(storedError?.message).toBe("Validation failed");
      expect(storedError?.statusCode).toBe(400);
      expect(storedError?.errorCategory).toBe(
        ReservationErrorCategory.VALIDATION_ERROR
      );
      expect(storedError?.context.reservationId).toBe("res-123");
      expect(storedError?.isResolved).toBe(false);
    });

    it("should log error with context", () => {
      const error = new AppError("Test error", 500);

      tracker.trackError(error, ReservationErrorCategory.UNKNOWN);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Reservation error tracked"),
        expect.objectContaining({
          category: ReservationErrorCategory.UNKNOWN,
        })
      );
    });

    it("should increment error analytics", () => {
      const error = new AppError("Test", 400);

      tracker.trackError(error, ReservationErrorCategory.VALIDATION_ERROR);
      tracker.trackError(error, ReservationErrorCategory.VALIDATION_ERROR);
      tracker.trackError(error, ReservationErrorCategory.RESOURCE_CONFLICT);

      const analytics = tracker.getErrorAnalytics();

      expect(analytics.get(ReservationErrorCategory.VALIDATION_ERROR)).toBe(2);
      expect(analytics.get(ReservationErrorCategory.RESOURCE_CONFLICT)).toBe(1);
    });
  });

  describe("trackErrorFromRequest", () => {
    it("should extract context from request", () => {
      const error = new AppError(
        "Not found",
        404,
        ErrorType.RESOURCE_NOT_FOUND
      );
      const mockReq = {
        headers: { "x-request-id": "req-123" },
        body: {
          customerId: "cust-1",
          petId: "pet-1",
          resourceId: "res-1",
          startDate: "2024-06-15",
          endDate: "2024-06-20",
        },
        query: {},
        params: { id: "reservation-123" },
        path: "/api/reservations/123",
        method: "PUT",
        tenantId: "tenant-1",
      } as unknown as Request;

      const errorId = tracker.trackErrorFromRequest(
        error,
        mockReq,
        ReservationErrorCategory.RESOURCE_NOT_FOUND
      );

      const storedError = tracker.getError(errorId!);

      expect(storedError?.context.requestId).toBe("req-123");
      expect(storedError?.context.customerId).toBe("cust-1");
      expect(storedError?.context.petId).toBe("pet-1");
      expect(storedError?.context.tenant).toBe("tenant-1");
    });

    it("should auto-determine category for validation errors", () => {
      const error = new AppError(
        "Invalid input",
        400,
        ErrorType.VALIDATION_ERROR
      );
      const mockReq = {
        headers: {},
        body: { customerId: "cust-1" },
        query: {},
        params: {},
        path: "/api/reservations",
        method: "POST",
      } as unknown as Request;

      const errorId = tracker.trackErrorFromRequest(error, mockReq);
      const storedError = tracker.getError(errorId!);

      expect(storedError?.errorCategory).toBe(
        ReservationErrorCategory.CUSTOMER_VALIDATION
      );
    });

    it("should detect resource not found errors", () => {
      const error = new AppError(
        "Resource not found",
        404,
        ErrorType.RESOURCE_NOT_FOUND
      );
      error.message = "Resource with ID xyz not found";
      const mockReq = {
        headers: {},
        body: {},
        query: {},
        params: {},
        path: "/api/resources/xyz",
        method: "GET",
      } as unknown as Request;

      const errorId = tracker.trackErrorFromRequest(error, mockReq);
      const storedError = tracker.getError(errorId!);

      expect(storedError?.errorCategory).toBe(
        ReservationErrorCategory.RESOURCE_NOT_FOUND
      );
    });

    it("should detect conflict errors from message", () => {
      const error = new Error("Date range conflict detected");
      const mockReq = {
        headers: {},
        body: {},
        query: {},
        params: {},
        path: "/api/reservations",
        method: "POST",
      } as unknown as Request;

      const errorId = tracker.trackErrorFromRequest(error, mockReq);
      const storedError = tracker.getError(errorId!);

      expect(storedError?.errorCategory).toBe(
        ReservationErrorCategory.DATE_CONFLICT
      );
    });

    it("should detect capacity errors from message", () => {
      const error = new Error("Kennel is full");
      const mockReq = {
        headers: {},
        body: {},
        query: {},
        params: {},
        path: "/api/reservations",
        method: "POST",
      } as unknown as Request;

      const errorId = tracker.trackErrorFromRequest(error, mockReq);
      const storedError = tracker.getError(errorId!);

      expect(storedError?.errorCategory).toBe(
        ReservationErrorCategory.CAPACITY_EXCEEDED
      );
    });
  });

  describe("getError", () => {
    it("should return error by ID", () => {
      const error = new AppError("Test", 400);
      const errorId = tracker.trackError(error);

      const retrieved = tracker.getError(errorId!);

      expect(retrieved).toBeDefined();
      expect(retrieved?.message).toBe("Test");
    });

    it("should return undefined for non-existent ID", () => {
      const retrieved = tracker.getError("non-existent-id");

      expect(retrieved).toBeUndefined();
    });
  });

  describe("getErrorsByCategory", () => {
    it("should return all errors of a specific category", () => {
      tracker.trackError(
        new AppError("Error 1", 400),
        ReservationErrorCategory.VALIDATION_ERROR
      );
      tracker.trackError(
        new AppError("Error 2", 400),
        ReservationErrorCategory.VALIDATION_ERROR
      );
      tracker.trackError(
        new AppError("Error 3", 409),
        ReservationErrorCategory.RESOURCE_CONFLICT
      );

      const validationErrors = tracker.getErrorsByCategory(
        ReservationErrorCategory.VALIDATION_ERROR
      );

      expect(validationErrors).toHaveLength(2);
      expect(validationErrors[0].message).toBe("Error 1");
      expect(validationErrors[1].message).toBe("Error 2");
    });

    it("should return empty array for category with no errors", () => {
      const errors = tracker.getErrorsByCategory(
        ReservationErrorCategory.DB_CONNECTION_ERROR
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe("getErrorAnalytics", () => {
    it("should return error counts by category", () => {
      tracker.trackError(
        new AppError("E1", 400),
        ReservationErrorCategory.VALIDATION_ERROR
      );
      tracker.trackError(
        new AppError("E2", 400),
        ReservationErrorCategory.VALIDATION_ERROR
      );
      tracker.trackError(
        new AppError("E3", 404),
        ReservationErrorCategory.RESOURCE_NOT_FOUND
      );

      const analytics = tracker.getErrorAnalytics();

      expect(analytics.get(ReservationErrorCategory.VALIDATION_ERROR)).toBe(2);
      expect(analytics.get(ReservationErrorCategory.RESOURCE_NOT_FOUND)).toBe(
        1
      );
      expect(analytics.get(ReservationErrorCategory.UNKNOWN)).toBe(0);
    });
  });

  describe("getErrorAnalyticsObject", () => {
    it("should return analytics as plain object", () => {
      tracker.trackError(
        new AppError("E1", 400),
        ReservationErrorCategory.VALIDATION_ERROR
      );

      const analytics = tracker.getErrorAnalyticsObject();

      expect(typeof analytics).toBe("object");
      expect(analytics[ReservationErrorCategory.VALIDATION_ERROR]).toBe(1);
    });
  });

  describe("resolveError", () => {
    it("should mark error as resolved", () => {
      const errorId = tracker.trackError(
        new AppError("Test", 400),
        ReservationErrorCategory.VALIDATION_ERROR
      );

      const result = tracker.resolveError(errorId!, "admin", "Fixed the issue");

      expect(result).toBe(true);

      const error = tracker.getError(errorId!);
      expect(error?.isResolved).toBe(true);
      expect(error?.resolvedBy).toBe("admin");
      expect(error?.resolution).toBe("Fixed the issue");
      expect(error?.resolvedAt).toBeDefined();
    });

    it("should return false for non-existent error", () => {
      const result = tracker.resolveError("non-existent-id");

      expect(result).toBe(false);
    });

    it("should use default resolvedBy value", () => {
      const errorId = tracker.trackError(new AppError("Test", 400));

      tracker.resolveError(errorId!);

      const error = tracker.getError(errorId!);
      expect(error?.resolvedBy).toBe("system");
    });
  });

  describe("clearErrors", () => {
    it("should clear all tracked errors", () => {
      tracker.trackError(new AppError("E1", 400));
      tracker.trackError(new AppError("E2", 400));

      tracker.clearErrors();

      const analytics = tracker.getErrorAnalytics();
      let totalErrors = 0;
      analytics.forEach((count) => {
        totalErrors += count;
      });

      expect(totalErrors).toBe(0);
    });

    it("should reset analytics counters", () => {
      tracker.trackError(
        new AppError("E1", 400),
        ReservationErrorCategory.VALIDATION_ERROR
      );

      tracker.clearErrors();

      const analytics = tracker.getErrorAnalytics();
      expect(analytics.get(ReservationErrorCategory.VALIDATION_ERROR)).toBe(0);
    });
  });

  describe("ReservationErrorCategory enum", () => {
    it("should have all expected categories", () => {
      expect(ReservationErrorCategory.VALIDATION_ERROR).toBe(
        "VALIDATION_ERROR"
      );
      expect(ReservationErrorCategory.RESOURCE_UNAVAILABLE).toBe(
        "RESOURCE_UNAVAILABLE"
      );
      expect(ReservationErrorCategory.RESOURCE_CONFLICT).toBe(
        "RESOURCE_CONFLICT"
      );
      expect(ReservationErrorCategory.RESOURCE_NOT_FOUND).toBe(
        "RESOURCE_NOT_FOUND"
      );
      expect(ReservationErrorCategory.CUSTOMER_NOT_FOUND).toBe(
        "CUSTOMER_NOT_FOUND"
      );
      expect(ReservationErrorCategory.PET_NOT_FOUND).toBe("PET_NOT_FOUND");
      expect(ReservationErrorCategory.DATE_RANGE_INVALID).toBe(
        "DATE_RANGE_INVALID"
      );
      expect(ReservationErrorCategory.DATE_PARSING_ERROR).toBe(
        "DATE_PARSING_ERROR"
      );
      expect(ReservationErrorCategory.DATE_CONFLICT).toBe("DATE_CONFLICT");
      expect(ReservationErrorCategory.SERVICE_UNAVAILABLE).toBe(
        "SERVICE_UNAVAILABLE"
      );
      expect(ReservationErrorCategory.CAPACITY_EXCEEDED).toBe(
        "CAPACITY_EXCEEDED"
      );
      expect(ReservationErrorCategory.DB_CONNECTION_ERROR).toBe(
        "DB_CONNECTION_ERROR"
      );
      expect(ReservationErrorCategory.SCHEMA_ERROR).toBe("SCHEMA_ERROR");
      expect(ReservationErrorCategory.UNKNOWN).toBe("UNKNOWN");
    });
  });
});
