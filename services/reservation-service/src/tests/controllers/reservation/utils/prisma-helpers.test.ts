// @ts-nocheck
/**
 * Tests for prisma-helpers.ts
 *
 * Tests the Prisma helper utility functions.
 */

// Mock dependencies before imports
jest.mock("../../../../config/prisma", () => ({
  prisma: {
    reservation: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../../../utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../../../utils/service", () => ({
  AppError: {
    notFoundError: jest.fn((msg) => new Error(`NOT_FOUND: ${msg}`)),
    conflictError: jest.fn((msg) => new Error(`CONFLICT: ${msg}`)),
    databaseError: jest.fn((msg) => new Error(`DB_ERROR: ${msg}`)),
  },
}));

import { safeExecutePrismaQuery } from "../../../../controllers/reservation/utils/prisma-helpers";
import { logger } from "../../../../utils/logger";
import { AppError } from "../../../../utils/service";

describe("Prisma Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("safeExecutePrismaQuery", () => {
    describe("successful queries", () => {
      it("should return query result on success", async () => {
        const mockData = [{ id: "1", name: "Test" }];
        const queryFn = jest.fn().mockResolvedValue(mockData);

        const result = await safeExecutePrismaQuery(queryFn);

        expect(result).toEqual(mockData);
        expect(queryFn).toHaveBeenCalled();
      });

      it("should not log errors on success", async () => {
        const queryFn = jest.fn().mockResolvedValue({ id: "1" });

        await safeExecutePrismaQuery(queryFn);

        expect(logger.error).not.toHaveBeenCalled();
      });
    });

    describe("failed queries with fallback", () => {
      it("should return fallback value on error", async () => {
        const queryFn = jest.fn().mockRejectedValue(new Error("Query failed"));
        const fallbackValue = [];

        const result = await safeExecutePrismaQuery(queryFn, fallbackValue);

        expect(result).toEqual([]);
      });

      it("should return null as default fallback", async () => {
        const queryFn = jest.fn().mockRejectedValue(new Error("Query failed"));

        const result = await safeExecutePrismaQuery(queryFn);

        expect(result).toBeNull();
      });

      it("should log error with context", async () => {
        const error = new Error("Database connection failed");
        const queryFn = jest.fn().mockRejectedValue(error);

        await safeExecutePrismaQuery(queryFn, null, "Custom error message");

        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining("Custom error message"),
          expect.objectContaining({
            error: "Database connection failed",
          })
        );
      });
    });

    describe("failed queries with throwError", () => {
      it("should throw on error when throwError is true", async () => {
        const queryFn = jest.fn().mockRejectedValue(new Error("Query failed"));

        await expect(
          safeExecutePrismaQuery(queryFn, null, "Error", true)
        ).rejects.toThrow();
      });

      it("should throw notFoundError for P2025 Prisma error", async () => {
        const prismaError = new Error("Record not found");
        (prismaError as any).code = "P2025";
        (prismaError as any).meta = { target: "reservation" };

        const queryFn = jest.fn().mockRejectedValue(prismaError);

        await expect(
          safeExecutePrismaQuery(queryFn, null, "Error", true)
        ).rejects.toThrow();

        expect(AppError.notFoundError).toHaveBeenCalledWith(
          expect.stringContaining("reservation")
        );
      });

      it("should throw conflictError for P2002 Prisma error", async () => {
        const prismaError = new Error("Unique constraint failed");
        (prismaError as any).code = "P2002";
        (prismaError as any).meta = { target: "email" };

        const queryFn = jest.fn().mockRejectedValue(prismaError);

        await expect(
          safeExecutePrismaQuery(queryFn, null, "Error", true)
        ).rejects.toThrow();

        expect(AppError.conflictError).toHaveBeenCalledWith(
          expect.stringContaining("email")
        );
      });

      it("should throw databaseError for other Prisma errors", async () => {
        const prismaError = new Error("Unknown error");
        (prismaError as any).code = "P9999";

        const queryFn = jest.fn().mockRejectedValue(prismaError);

        await expect(
          safeExecutePrismaQuery(queryFn, null, "Database error", true)
        ).rejects.toThrow();

        expect(AppError.databaseError).toHaveBeenCalled();
      });
    });

    describe("error context extraction", () => {
      it("should extract Prisma error code", async () => {
        const prismaError = new Error("Error");
        (prismaError as any).code = "P2025";

        const queryFn = jest.fn().mockRejectedValue(prismaError);

        await safeExecutePrismaQuery(queryFn, null, "Error message");

        expect(logger.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            prismaError: "P2025",
          })
        );
      });

      it("should extract target from meta", async () => {
        const prismaError = new Error("Error");
        (prismaError as any).meta = { target: ["id", "tenantId"] };

        const queryFn = jest.fn().mockRejectedValue(prismaError);

        await safeExecutePrismaQuery(queryFn, null, "Error message");

        expect(logger.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            target: ["id", "tenantId"],
          })
        );
      });

      it("should handle missing error code gracefully", async () => {
        const error = new Error("Simple error");

        const queryFn = jest.fn().mockRejectedValue(error);

        await safeExecutePrismaQuery(queryFn, null, "Error message");

        expect(logger.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            prismaError: "",
          })
        );
      });

      it("should handle missing meta gracefully", async () => {
        const error = new Error("Simple error");

        const queryFn = jest.fn().mockRejectedValue(error);

        await safeExecutePrismaQuery(queryFn, null, "Error message");

        expect(logger.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            target: "",
          })
        );
      });
    });

    describe("async behavior", () => {
      it("should handle async query functions", async () => {
        const queryFn = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { id: "1" };
        });

        const result = await safeExecutePrismaQuery(queryFn);

        expect(result).toEqual({ id: "1" });
      });

      it("should handle async errors", async () => {
        const queryFn = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Async error");
        });

        const result = await safeExecutePrismaQuery(queryFn, "fallback");

        expect(result).toBe("fallback");
      });
    });
  });
});
