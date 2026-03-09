// @ts-nocheck
/**
 * Tests for catchAsync middleware
 *
 * Tests the async error handler that wraps controller functions
 * to automatically catch and forward errors.
 */

import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../middleware/catchAsync";

describe("catchAsync", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it("should call the wrapped function with req, res, next", async () => {
    const mockFn = jest.fn().mockResolvedValue(undefined);
    const wrapped = catchAsync(mockFn);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
  });

  it("should not call next when function succeeds", async () => {
    const mockFn = jest.fn().mockResolvedValue({ data: "success" });
    const wrapped = catchAsync(mockFn);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    // Wait for promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should call next with error when function throws", async () => {
    const error = new Error("Test error");
    const mockFn = jest.fn().mockRejectedValue(error);
    const wrapped = catchAsync(mockFn);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    // Wait for promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it("should handle synchronous errors in async functions", async () => {
    const error = new Error("Sync error in async");
    const mockFn = jest.fn().mockImplementation(async () => {
      throw error;
    });
    const wrapped = catchAsync(mockFn);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it("should preserve the function context", async () => {
    const mockFn = jest
      .fn()
      .mockImplementation(async function (req, res, next) {
        res.status(200).json({ success: true });
      });
    const wrapped = catchAsync(mockFn);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });

  it("should handle multiple sequential calls", async () => {
    let callCount = 0;
    const mockFn = jest.fn().mockImplementation(async () => {
      callCount++;
    });
    const wrapped = catchAsync(mockFn);

    await wrapped(mockReq as Request, mockRes as Response, mockNext);
    await wrapped(mockReq as Request, mockRes as Response, mockNext);
    await wrapped(mockReq as Request, mockRes as Response, mockNext);

    expect(callCount).toBe(3);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});
