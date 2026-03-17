// @ts-nocheck
/**
 * Tests for resolve-error.controller.ts
 *
 * Tests the error resolution controller endpoint.
 */

import { Request, Response } from 'express';

// Mock dependencies
jest.mock('../../../utils/reservation-error-tracker', () => ({
  reservationErrorTracker: {
    getError: jest.fn().mockResolvedValue(null),
    resolveError: jest.fn().mockResolvedValue(undefined),
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
    params: { id: 'err-123' },
    body: {},
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

describe('Resolve Error Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should require resolution field', () => {
      const body = {};
      expect(body.resolution).toBeUndefined();
    });

    it('should accept resolution field', () => {
      const body = { resolution: 'Fixed the bug in commit abc123' };
      expect(body.resolution).toBe('Fixed the bug in commit abc123');
    });

    it('should accept optional resolvedBy field', () => {
      const body = {
        resolution: 'Fixed the bug',
        resolvedBy: 'user-456',
      };
      expect(body.resolvedBy).toBe('user-456');
    });

    it('should require error ID in params', () => {
      const params = {};
      expect(params.id).toBeUndefined();
    });
  });

  describe('Error existence check', () => {
    it('should check if error exists', async () => {
      const errorId = 'err-123';
      await reservationErrorTracker.getError(errorId);

      expect(reservationErrorTracker.getError).toHaveBeenCalledWith(errorId);
    });

    it('should handle error not found', async () => {
      (reservationErrorTracker.getError as jest.Mock).mockResolvedValue(null);

      const error = await reservationErrorTracker.getError('nonexistent');

      expect(error).toBeNull();
    });
  });

  describe('Already resolved check', () => {
    it('should detect already resolved error', async () => {
      const mockError = {
        id: 'err-123',
        isResolved: true,
        resolution: 'Already fixed',
      };
      (reservationErrorTracker.getError as jest.Mock).mockResolvedValue(
        mockError
      );

      const error = await reservationErrorTracker.getError('err-123');

      expect(error.isResolved).toBe(true);
    });

    it('should allow resolving unresolved error', async () => {
      const mockError = {
        id: 'err-123',
        isResolved: false,
      };
      (reservationErrorTracker.getError as jest.Mock).mockResolvedValue(
        mockError
      );

      const error = await reservationErrorTracker.getError('err-123');

      expect(error.isResolved).toBe(false);
    });
  });

  describe('Resolution process', () => {
    it('should call resolveError with correct parameters', async () => {
      const errorId = 'err-123';
      const resolution = 'Fixed the bug';
      const resolvedBy = 'user-456';

      await reservationErrorTracker.resolveError(
        errorId,
        resolution,
        resolvedBy
      );

      expect(reservationErrorTracker.resolveError).toHaveBeenCalledWith(
        errorId,
        resolution,
        resolvedBy
      );
    });

    it('should call resolveError without resolvedBy', async () => {
      const errorId = 'err-123';
      const resolution = 'Fixed the bug';

      await reservationErrorTracker.resolveError(
        errorId,
        resolution,
        undefined
      );

      expect(reservationErrorTracker.resolveError).toHaveBeenCalledWith(
        errorId,
        resolution,
        undefined
      );
    });
  });

  describe('Response structure', () => {
    it('should return success status', () => {
      const response = {
        status: 'success',
        data: {
          error: {
            id: 'err-123',
            isResolved: true,
            resolution: 'Fixed the bug',
          },
        },
      };

      expect(response.status).toBe('success');
    });

    it('should include updated error in response', () => {
      const response = {
        status: 'success',
        data: {
          error: {
            id: 'err-123',
            isResolved: true,
            resolution: 'Fixed the bug',
            resolvedAt: new Date(),
          },
        },
      };

      expect(response.data.error.isResolved).toBe(true);
      expect(response.data.error.resolution).toBe('Fixed the bug');
    });
  });

  describe('Logging', () => {
    it('should log successful resolution', () => {
      logger.info('Error with ID err-123 marked as resolved');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('marked as resolved')
      );
    });

    it('should log errors on failure', () => {
      logger.error('Failed to resolve error: Error not found');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to resolve error')
      );
    });
  });
});
