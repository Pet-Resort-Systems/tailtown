// @ts-nocheck
/**
 * Tests for check-in.controller.ts
 *
 * Tests the check-in controller endpoints for managing pet check-ins
 * with questionnaire responses, medications, and belongings.
 */

import { Request, Response } from 'express';

// Mock the prisma client
jest.mock('../../config/prisma', () => ({
  prisma: {
    checkIn: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    reservation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    checkInResponse: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    checkInMedication: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    checkInBelonging: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        checkIn: {
          create: jest.fn(),
          update: jest.fn(),
        },
        checkInResponse: {
          createMany: jest.fn(),
          deleteMany: jest.fn(),
        },
        checkInMedication: {
          createMany: jest.fn(),
          deleteMany: jest.fn(),
        },
        checkInBelonging: {
          createMany: jest.fn(),
          deleteMany: jest.fn(),
        },
        reservation: {
          update: jest.fn(),
        },
      })
    ),
  },
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { prisma } from '../../config/prisma';
import { logger } from '../../utils/logger';
import {
  getAllCheckIns,
  getCheckInById,
} from '../../controllers/check-in.controller';

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {
      'x-tenant-id': 'test-tenant',
    },
    ...overrides,
  } as Request;
};

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe('Check-In Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCheckIns', () => {
    it('should return all check-ins for a tenant', async () => {
      const mockCheckIns = [
        {
          id: 'checkin-1',
          tenantId: 'test-tenant',
          petId: 'pet-1',
          reservationId: 'res-1',
          checkInTime: new Date('2024-01-15T10:00:00Z'),
          reservation: {
            id: 'res-1',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-20'),
            status: 'CHECKED_IN',
          },
          template: { id: 'template-1', name: 'Standard Check-In' },
          responses: [],
          medications: [],
          belongings: [],
          agreement: null,
        },
      ];

      (prisma.checkIn.findMany as jest.Mock).mockResolvedValue(mockCheckIns);

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllCheckIns(req, res);

      expect(prisma.checkIn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'test-tenant' },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: mockCheckIns,
      });
    });

    it('should filter by petId when provided', async () => {
      (prisma.checkIn.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        query: { petId: 'pet-123' },
      });
      const res = createMockResponse();

      await getAllCheckIns(req, res);

      expect(prisma.checkIn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'test-tenant',
            petId: 'pet-123',
          }),
        })
      );
    });

    it('should filter by reservationId when provided', async () => {
      (prisma.checkIn.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        query: { reservationId: 'res-456' },
      });
      const res = createMockResponse();

      await getAllCheckIns(req, res);

      expect(prisma.checkIn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'test-tenant',
            reservationId: 'res-456',
          }),
        })
      );
    });

    it('should filter by date range when provided', async () => {
      (prisma.checkIn.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });
      const res = createMockResponse();

      await getAllCheckIns(req, res);

      expect(prisma.checkIn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'test-tenant',
            checkInTime: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      (prisma.checkIn.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllCheckIns(req, res);

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching check-ins',
        expect.objectContaining({
          tenantId: 'test-tenant',
          error: 'Database connection failed',
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to fetch check-ins',
      });
    });
  });

  describe('getCheckInById', () => {
    it('should return a check-in by ID', async () => {
      const mockCheckIn = {
        id: 'checkin-1',
        tenantId: 'test-tenant',
        petId: 'pet-1',
        reservationId: 'res-1',
        checkInTime: new Date('2024-01-15T10:00:00Z'),
        reservation: {
          id: 'res-1',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-20'),
          status: 'CHECKED_IN',
        },
        template: {
          id: 'template-1',
          name: 'Standard Check-In',
          sections: [],
        },
        responses: [],
        medications: [],
        belongings: [],
        agreement: null,
        activities: [],
      };

      (prisma.checkIn.findFirst as jest.Mock).mockResolvedValue(mockCheckIn);

      const req = createMockRequest({
        params: { id: 'checkin-1' },
      });
      const res = createMockResponse();

      await getCheckInById(req, res);

      expect(prisma.checkIn.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'checkin-1', tenantId: 'test-tenant' },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockCheckIn,
      });
    });

    it('should return 404 when check-in not found', async () => {
      (prisma.checkIn.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        params: { id: 'nonexistent-id' },
      });
      const res = createMockResponse();

      await getCheckInById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Check-in not found',
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.checkIn.findFirst as jest.Mock).mockRejectedValue(
        new Error('Query failed')
      );

      const req = createMockRequest({
        params: { id: 'checkin-1' },
      });
      const res = createMockResponse();

      await getCheckInById(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
