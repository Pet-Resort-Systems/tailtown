// @ts-nocheck
/**
 * Tests for schemaUtils.ts
 *
 * Tests the schema alignment utilities that handle database queries
 * with proper error handling and fallback values.
 */

import { PrismaClient } from '../../generated/prisma/client.js';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Import after mocking
import {
  safeExecutePrismaQuery,
  tableExists,
  columnExists,
} from '../../utils/schemaUtils';
import { logger } from '../../utils/logger';

describe('schemaUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('safeExecutePrismaQuery', () => {
    it('should return the result of a successful query', async () => {
      const mockData = { id: '1', name: 'Test' };
      const queryFn = jest.fn().mockResolvedValue(mockData);

      const result = await safeExecutePrismaQuery(queryFn);

      expect(result).toEqual(mockData);
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return fallback value when query fails', async () => {
      const fallbackValue = { default: true };
      const queryFn = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await safeExecutePrismaQuery(queryFn, fallbackValue);

      expect(result).toEqual(fallbackValue);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return null as default fallback when query fails', async () => {
      const queryFn = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await safeExecutePrismaQuery(queryFn);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error when throwError is true', async () => {
      const error = new Error('Database error');
      const queryFn = jest.fn().mockRejectedValue(error);

      await expect(
        safeExecutePrismaQuery(queryFn, null, 'Custom error message', true)
      ).rejects.toThrow('Database error');
    });

    it('should log custom error message', async () => {
      const queryFn = jest.fn().mockRejectedValue(new Error('DB failed'));
      const customMessage = 'Failed to fetch user data';

      await safeExecutePrismaQuery(queryFn, null, customMessage);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(customMessage)
      );
    });

    it('should handle Prisma-specific errors', async () => {
      const prismaError = new Error('Prisma error');
      (prismaError as any).code = 'P2002';
      (prismaError as any).meta = { target: ['email'] };
      const queryFn = jest.fn().mockRejectedValue(prismaError);

      await safeExecutePrismaQuery(queryFn);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('schema mismatches')
      );
    });

    it('should handle non-Error objects', async () => {
      const queryFn = jest.fn().mockRejectedValue('String error');

      const result = await safeExecutePrismaQuery(queryFn, 'fallback');

      expect(result).toBe('fallback');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('tableExists', () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: jest.fn(),
      };
    });

    it('should return true when table exists', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

      const result = await tableExists(mockPrisma as PrismaClient, 'users');

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when table does not exist', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: false }]);

      const result = await tableExists(
        mockPrisma as PrismaClient,
        'nonexistent'
      );

      expect(result).toBe(false);
    });

    it('should return false and log error when query fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Query failed'));

      const result = await tableExists(mockPrisma as PrismaClient, 'users');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error checking if table users exists')
      );
    });
  });

  describe('columnExists', () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: jest.fn(),
      };
    });

    it('should return true when column exists', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

      const result = await columnExists(
        mockPrisma as PrismaClient,
        'users',
        'email'
      );

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when column does not exist', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: false }]);

      const result = await columnExists(
        mockPrisma as PrismaClient,
        'users',
        'nonexistent_column'
      );

      expect(result).toBe(false);
    });

    it('should return false and log error when query fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Query failed'));

      const result = await columnExists(
        mockPrisma as PrismaClient,
        'users',
        'email'
      );

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error checking if column email in table users exists'
        )
      );
    });
  });
});
