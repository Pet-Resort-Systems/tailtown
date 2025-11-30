// @ts-nocheck
/**
 * Tests for errorHandler middleware
 *
 * Tests the error handling middleware that provides consistent
 * error responses across the application.
 */

import { Request, Response, NextFunction } from "express";

// Mock dependencies before importing
jest.mock("../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../utils/reservation-error-tracker", () => ({
  reservationErrorTracker: {
    trackErrorFromRequest: jest.fn().mockReturnValue("error-123"),
  },
  ReservationErrorCategory: {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    DB_CONNECTION_ERROR: "DB_CONNECTION_ERROR",
    RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
    RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
    UNKNOWN: "UNKNOWN",
  },
}));

import {
  errorHandler,
  handlePrismaError,
  sendErrorDev,
  sendErrorProd,
  asyncHandler,
} from "../../middleware/errorHandler";
import { AppError, ErrorType } from "../../utils/appError";
import { logger } from "../../utils/logger";

describe("errorHandler middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      method: "GET",
      path: "/api/test",
      query: {},
      headers: {
        "user-agent": "test-agent",
        "x-request-id": "req-123",
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("handlePrismaError", () => {
    it("should handle P2002 (unique constraint) error", () => {
      const prismaError = {
        code: "P2002",
        meta: { target: ["email"] },
      };

      const result = handlePrismaError(prismaError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(409);
      expect(result.message).toContain("Duplicate field value");
      expect(result.message).toContain("email");
    });

    it("should handle P2025 (record not found) error", () => {
      const prismaError = {
        code: "P2025",
        meta: { modelName: "Reservation" },
      };

      const result = handlePrismaError(prismaError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(404);
      expect(result.message).toContain("Reservation");
    });

    it("should handle P2003 (foreign key constraint) error", () => {
      const prismaError = {
        code: "P2003",
        meta: { field_name: "customerId" },
      };

      const result = handlePrismaError(prismaError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain("Foreign key constraint");
    });

    it("should handle P2010 (raw query failed) error", () => {
      const prismaError = {
        code: "P2010",
        meta: { query: "SELECT * FROM invalid" },
      };

      const result = handlePrismaError(prismaError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.type).toBe(ErrorType.DATABASE_ERROR);
    });

    it("should handle unknown Prisma errors", () => {
      const prismaError = {
        code: "P9999",
        meta: { unknown: "data" },
      };

      const result = handlePrismaError(prismaError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toBe("Database operation failed");
    });

    it("should handle array of target fields", () => {
      const prismaError = {
        code: "P2002",
        meta: { target: ["email", "tenantId"] },
      };

      const result = handlePrismaError(prismaError);

      expect(result.message).toContain("email, tenantId");
    });
  });

  describe("sendErrorDev", () => {
    it("should send detailed error response in development", () => {
      const error = new AppError("Test error", 400, ErrorType.VALIDATION_ERROR);
      error.details = { field: "email" };
      error.context = { userId: "123" };

      sendErrorDev(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Test error",
          error: expect.objectContaining({
            type: ErrorType.VALIDATION_ERROR,
            details: { field: "email" },
            stack: expect.any(String),
            context: { userId: "123" },
          }),
        })
      );
    });

    it("should include request ID in response", () => {
      const error = new AppError("Test error", 500);

      sendErrorDev(error, mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "req-123",
        })
      );
    });

    it("should log error details", () => {
      const error = new AppError("Test error", 500);
      error.context = { test: true };

      sendErrorDev(error, mockReq as Request, mockRes as Response);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe("sendErrorProd", () => {
    it("should send minimal error response for operational errors", () => {
      const error = new AppError(
        "User not found",
        404,
        ErrorType.RESOURCE_NOT_FOUND
      );

      sendErrorProd(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "User not found",
          error: {
            type: ErrorType.RESOURCE_NOT_FOUND,
          },
        })
      );
      // Should not include stack trace
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        })
      );
    });

    it("should send generic message for non-operational errors", () => {
      const error = new AppError(
        "Database crashed",
        500,
        ErrorType.SERVER_ERROR,
        false
      );

      sendErrorProd(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Something went wrong",
        })
      );
    });
  });

  describe("errorHandler", () => {
    it("should skip if headers already sent", () => {
      mockRes.headersSent = true;
      const error = new Error("Test");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should set default status code to 500", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Test");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it("should handle Prisma errors", () => {
      process.env.NODE_ENV = "development";
      const prismaError = {
        code: "P2002",
        meta: { target: ["email"] },
        message: "Unique constraint failed",
      };

      errorHandler(
        prismaError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it("should handle JSON parsing errors", () => {
      process.env.NODE_ENV = "development";
      const jsonError = {
        type: "entity.parse.failed",
        message: "Unexpected token",
      };

      errorHandler(
        jsonError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("should handle ValidationError", () => {
      process.env.NODE_ENV = "development";
      const validationError = {
        name: "ValidationError",
        message: "Invalid input",
        errors: { email: "Invalid format" },
      };

      errorHandler(
        validationError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("should handle JWT errors", () => {
      process.env.NODE_ENV = "development";
      const jwtError = {
        name: "JsonWebTokenError",
        message: "jwt malformed",
      };

      errorHandler(jwtError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should handle TokenExpiredError", () => {
      process.env.NODE_ENV = "development";
      const tokenError = {
        name: "TokenExpiredError",
        message: "jwt expired",
      };

      errorHandler(
        tokenError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should add request context to error", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Test");

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            context: expect.objectContaining({
              requestInfo: expect.objectContaining({
                method: "GET",
                path: "/api/test",
              }),
            }),
          }),
        })
      );
    });
  });

  describe("asyncHandler", () => {
    it("should call the wrapped function", async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(mockFn);

      await wrapped(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it("should catch errors and pass to next", async () => {
      const error = new Error("Async error");
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(mockFn);

      await wrapped(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
