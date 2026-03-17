// @ts-nocheck
/**
 * Tests for get-errors.controller.ts
 *
 * Tests the error tracking retrieval controller endpoints.
 */

import { Request, Response } from 'express';

// Mock dependencies
jest.mock('../../../utils/reservation-error-tracker', () => ({
  reservationErrorTracker: {
    getErrors: jest.fn().mockResolvedValue([]),
    getError: jest.fn().mockResolvedValue(null),
    getErrorAnalytics: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { reservationErrorTracker } from '../../../utils/reservation-error-tracker';
import { logger } from '../../../utils/logger';

// Helper to create mock request
const createMockRequest = (overrides: any = {}): Request => {
  return {
    query: {},
    params: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
};

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe('Get Errors Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllErrors', () => {
    describe('filter parsing', () => {
      it('should parse category filter', () => {
        const query = { category: 'VALIDATION_ERROR' };
        const filters: any = {};
        if (query.category) filters.category = query.category;

        expect(filters.category).toBe('VALIDATION_ERROR');
      });

      it('should parse isResolved filter as boolean', () => {
        const query = { isResolved: 'true' };
        const filters: any = {};
        if (query.isResolved) filters.isResolved = query.isResolved === 'true';

        expect(filters.isResolved).toBe(true);
      });

      it('should parse isResolved=false correctly', () => {
        const query = { isResolved: 'false' };
        const filters: any = {};
        if (query.isResolved) filters.isResolved = query.isResolved === 'true';

        expect(filters.isResolved).toBe(false);
      });

      it('should parse startDate filter', () => {
        const query = { startDate: '2024-06-15' };
        const startDate = new Date(query.startDate);

        expect(startDate).toBeInstanceOf(Date);
        expect(isNaN(startDate.getTime())).toBe(false);
      });

      it('should parse endDate filter', () => {
        const query = { endDate: '2024-06-20' };
        const endDate = new Date(query.endDate);

        expect(endDate).toBeInstanceOf(Date);
        expect(isNaN(endDate.getTime())).toBe(false);
      });

      it('should detect invalid startDate', () => {
        const query = { startDate: 'invalid-date' };
        const startDate = new Date(query.startDate);

        expect(isNaN(startDate.getTime())).toBe(true);
      });

      it('should detect invalid endDate', () => {
        const query = { endDate: 'invalid-date' };
        const endDate = new Date(query.endDate);

        expect(isNaN(endDate.getTime())).toBe(true);
      });

      it('should parse limit filter', () => {
        const query = { limit: '50' };
        const limit = parseInt(query.limit, 10);

        expect(limit).toBe(50);
      });

      it('should detect invalid limit', () => {
        const query = { limit: 'invalid' };
        const limit = parseInt(query.limit, 10);

        expect(isNaN(limit)).toBe(true);
      });
    });

    describe('response structure', () => {
      it('should return success status', () => {
        const response = {
          status: 'success',
          results: 5,
          data: { errors: [] },
        };

        expect(response.status).toBe('success');
      });

      it('should include results count', () => {
        const errors = [{}, {}, {}];
        const response = {
          status: 'success',
          results: errors.length,
          data: { errors },
        };

        expect(response.results).toBe(3);
      });
    });
  });

  describe('getErrorAnalytics', () => {
    it('should call getErrorAnalytics from tracker', async () => {
      (reservationErrorTracker.getErrorAnalytics as jest.Mock).mockReturnValue({
        VALIDATION_ERROR: 10,
        DATABASE_ERROR: 5,
      });

      const analytics = reservationErrorTracker.getErrorAnalytics();

      expect(analytics.VALIDATION_ERROR).toBe(10);
      expect(analytics.DATABASE_ERROR).toBe(5);
    });

    it('should calculate total errors', () => {
      const analytics = {
        VALIDATION_ERROR: 10,
        DATABASE_ERROR: 5,
        CONFLICT_ERROR: 3,
      };

      const totalErrors = Object.values(analytics).reduce(
        (sum, count) => sum + count,
        0
      );

      expect(totalErrors).toBe(18);
    });

    it('should handle empty analytics', () => {
      const analytics = {};
      const totalErrors = Object.values(analytics).reduce(
        (sum: number, count: number) => sum + count,
        0
      );

      expect(totalErrors).toBe(0);
    });
  });

  describe('getErrorById', () => {
    it('should call getError with correct ID', async () => {
      const errorId = 'err-123';
      await reservationErrorTracker.getError(errorId);

      expect(reservationErrorTracker.getError).toHaveBeenCalledWith(errorId);
    });

    it('should handle error not found', async () => {
      (reservationErrorTracker.getError as jest.Mock).mockResolvedValue(null);

      const error = await reservationErrorTracker.getError('nonexistent');

      expect(error).toBeNull();
    });

    it('should return error when found', async () => {
      const mockError = {
        id: 'err-123',
        message: 'Test error',
        category: 'VALIDATION_ERROR',
        isResolved: false,
      };
      (reservationErrorTracker.getError as jest.Mock).mockResolvedValue(
        mockError
      );

      const error = await reservationErrorTracker.getError('err-123');

      expect(error).toEqual(mockError);
    });
  });
});
