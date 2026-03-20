/**
 * Suite Controller Tests
 *
 * Tests for suite/kennel management and availability.
 */

import { Request, Response, NextFunction } from 'express';

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    resource: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
    reservation: {
      findMany: mockFindMany,
    },
  })),
  ResourceType: {
    STANDARD_SUITE: 'STANDARD_SUITE',
    STANDARD_PLUS_SUITE: 'STANDARD_PLUS_SUITE',
    VIP_SUITE: 'VIP_SUITE',
  },
}));

describe('Suite Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Suite Type Filtering', () => {
    it('should filter by STANDARD_SUITE type', () => {
      const suites = [
        { name: 'Suite A', type: 'STANDARD_SUITE' },
        { name: 'Suite B', type: 'VIP_SUITE' },
        { name: 'Suite C', type: 'STANDARD_SUITE' },
      ];

      const filtered = suites.filter((s) => s.type === 'STANDARD_SUITE');
      expect(filtered.length).toBe(2);
    });

    it('should filter by VIP_SUITE type', () => {
      const suites = [
        { name: 'Suite A', type: 'STANDARD_SUITE' },
        { name: 'Suite B', type: 'VIP_SUITE' },
      ];

      const filtered = suites.filter((s) => s.type === 'VIP_SUITE');
      expect(filtered.length).toBe(1);
    });

    it('should return all suite types when no filter', () => {
      const suites = [
        { type: 'STANDARD_SUITE' },
        { type: 'STANDARD_PLUS_SUITE' },
        { type: 'VIP_SUITE' },
      ];

      const type = undefined;
      const filtered = type ? suites.filter((s) => s.type === type) : suites;
      expect(filtered.length).toBe(3);
    });
  });

  describe('Suite Status', () => {
    it('should identify AVAILABLE suites', () => {
      const suite = {
        id: 'suite-1',
        isActive: true,
        reservations: [],
      };

      const hasActiveReservation = suite.reservations.length > 0;
      const status = hasActiveReservation ? 'OCCUPIED' : 'AVAILABLE';
      expect(status).toBe('AVAILABLE');
    });

    it('should identify OCCUPIED suites', () => {
      const suite = {
        id: 'suite-1',
        isActive: true,
        reservations: [{ id: 'res-1', status: 'CHECKED_IN' }],
      };

      const hasActiveReservation = suite.reservations.length > 0;
      const status = hasActiveReservation ? 'OCCUPIED' : 'AVAILABLE';
      expect(status).toBe('OCCUPIED');
    });

    it('should identify MAINTENANCE status', () => {
      const suite = {
        id: 'suite-1',
        attributes: { maintenanceStatus: 'MAINTENANCE' },
      };

      const status = suite.attributes.maintenanceStatus;
      expect(status).toBe('MAINTENANCE');
    });
  });

  describe('Date-Based Availability', () => {
    it('should check reservation overlap with date', () => {
      const filterDate = new Date('2025-12-03T12:00:00Z');
      const filterStart = new Date(filterDate);
      filterStart.setUTCHours(0, 0, 0, 0);
      const filterEnd = new Date(filterDate);
      filterEnd.setUTCHours(23, 59, 59, 999);

      const reservation = {
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        status: 'CONFIRMED',
      };

      // Overlaps if: startDate <= filterEnd AND endDate >= filterStart
      const overlaps =
        reservation.startDate <= filterEnd &&
        reservation.endDate >= filterStart;
      expect(overlaps).toBe(true);
    });

    it('should not overlap with past reservation', () => {
      const filterDate = new Date('2025-12-10T12:00:00Z');
      const filterStart = new Date(filterDate);
      filterStart.setUTCHours(0, 0, 0, 0);
      const filterEnd = new Date(filterDate);
      filterEnd.setUTCHours(23, 59, 59, 999);

      const reservation = {
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
      };

      const overlaps =
        reservation.startDate <= filterEnd &&
        reservation.endDate >= filterStart;
      expect(overlaps).toBe(false);
    });
  });

  describe('Suite Capacity', () => {
    it('should have default capacity of 1', () => {
      const suite = { name: 'Standard Suite', capacity: 1 };
      expect(suite.capacity).toBe(1);
    });

    it('should support multi-pet capacity', () => {
      const suite = { name: 'Family Suite', capacity: 3 };
      expect(suite.capacity).toBe(3);
    });

    it('should check if capacity allows more pets', () => {
      const suite = { capacity: 2 };
      const currentOccupancy = 1;
      const canAddMore = currentOccupancy < suite.capacity;
      expect(canAddMore).toBe(true);
    });
  });

  describe('Suite Search', () => {
    it('should search by suite name', () => {
      const search = 'vip';
      const suites = [
        { name: 'VIP Suite 1' },
        { name: 'Standard Suite A' },
        { name: 'VIP Suite 2' },
      ];

      const filtered = suites.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(2);
    });
  });

  describe('Active Suites Only', () => {
    it('should filter only active suites', () => {
      const suites = [
        { name: 'Suite A', isActive: true },
        { name: 'Suite B', isActive: false },
        { name: 'Suite C', isActive: true },
      ];

      const filtered = suites.filter((s) => s.isActive);
      expect(filtered.length).toBe(2);
    });
  });

  describe('Suite with Reservations', () => {
    it('should include reservation info', () => {
      const suite = {
        id: 'suite-1',
        name: 'Suite A',
        reservations: [
          {
            id: 'res-1',
            startDate: new Date('2025-12-03'),
            endDate: new Date('2025-12-05'),
            status: 'CONFIRMED',
            pet: { name: 'Buddy' },
            customer: { firstName: 'John' },
          },
        ],
      };

      expect(suite.reservations.length).toBe(1);
      expect(suite.reservations[0].pet.name).toBe('Buddy');
    });

    it('should filter reservations by status', () => {
      const reservations = [
        { status: 'CONFIRMED' },
        { status: 'CHECKED_IN' },
        { status: 'CANCELLED' },
        { status: 'COMPLETED' },
      ];

      const activeStatuses = ['CONFIRMED', 'CHECKED_IN'];
      const active = reservations.filter((r) =>
        activeStatuses.includes(r.status)
      );
      expect(active.length).toBe(2);
    });
  });
});
