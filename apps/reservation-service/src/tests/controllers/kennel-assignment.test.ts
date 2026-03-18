// @ts-nocheck
/**
 * Kennel Assignment Validation Tests
 * Tests for mandatory kennel assignment for boarding/daycare services
 */

import { PrismaClient } from '@prisma/client';
import { detectReservationConflicts } from '../../utils/reservation-conflicts';

// Mock the Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    reservation: {
      findMany: jest.fn(),
    },
    resource: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Get the mocked Prisma client
const prisma = new PrismaClient();

describe('Kennel Assignment Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Resource Availability Check', () => {
    it('should find available kennel when requested type has availability', async () => {
      // Mock available resources of the requested type
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([
        { id: 'kennel-1', type: 'STANDARD_SUITE', name: 'Suite 1' },
        { id: 'kennel-2', type: 'STANDARD_SUITE', name: 'Suite 2' },
      ]);

      // No conflicts for the first kennel
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        suiteType: 'STANDARD_SUITE',
        tenantId: 'tenant-1',
      });

      expect(result.hasConflicts).toBe(false);
    });

    it('should detect when all kennels of type are booked', async () => {
      // Mock resources
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([
        { id: 'kennel-1', type: 'VIP_SUITE', name: 'VIP 1' },
        { id: 'kennel-2', type: 'VIP_SUITE', name: 'VIP 2' },
      ]);

      // All kennels have conflicts
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        { id: 'res-1', resourceId: 'kennel-1' },
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        suiteType: 'VIP_SUITE',
        tenantId: 'tenant-1',
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.warnings.some((w) => w.includes('VIP_SUITE'))).toBe(true);
    });

    it('should handle case when no resources of type exist', async () => {
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        suiteType: 'NONEXISTENT_TYPE',
        tenantId: 'tenant-1',
      });

      expect(
        result.warnings.some((w) => w.includes('No resources found'))
      ).toBe(true);
    });
  });

  describe('Specific Resource Assignment', () => {
    it('should validate specific kennel is available', async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        resourceId: 'kennel-1',
        tenantId: 'tenant-1',
      });

      expect(result.hasConflicts).toBe(false);
    });

    it('should detect when specific kennel is already booked', async () => {
      const existingBooking = {
        id: 'existing-1',
        startDate: new Date('2026-06-12'),
        endDate: new Date('2026-06-17'),
        resourceId: 'kennel-1',
      };

      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([
        existingBooking,
      ]);

      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        resourceId: 'kennel-1',
        tenantId: 'tenant-1',
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictingReservations).toHaveLength(1);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should only check resources within the same tenant', async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      await detectReservationConflicts({
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        resourceId: 'kennel-1',
        tenantId: 'tenant-1',
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
          }),
        })
      );
    });

    it('should not see conflicts from other tenants', async () => {
      // No conflicts returned for this tenant
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        resourceId: 'kennel-1',
        tenantId: 'tenant-1',
      });

      expect(result.hasConflicts).toBe(false);
    });
  });

  describe('Date Range Validation', () => {
    it('should validate start date is before end date', async () => {
      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-15'),
        endDate: new Date('2026-06-10'),
        resourceId: 'kennel-1',
        tenantId: 'tenant-1',
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.warnings).toContain('Start date must be before end date');
    });

    it('should allow same-day reservations', async () => {
      (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await detectReservationConflicts({
        startDate: new Date('2026-06-10T08:00:00Z'),
        endDate: new Date('2026-06-10T18:00:00Z'),
        resourceId: 'kennel-1',
        tenantId: 'tenant-1',
      });

      expect(result.hasConflicts).toBe(false);
    });
  });
});
