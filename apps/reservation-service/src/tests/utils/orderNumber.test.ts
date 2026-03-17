// @ts-nocheck
/**
 * Tests for orderNumber.ts
 *
 * Tests the order number generation utility for reservations.
 */

// Mock dependencies
jest.mock('../../config/prisma', () => ({
  prisma: {
    reservation: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { generateOrderNumber } from '../../utils/orderNumber';

describe('orderNumber utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset date to a known value for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T10:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateOrderNumber', () => {
    it('should generate order number in correct format', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toMatch(/^RES-\d{8}-\d{3}$/);
    });

    it('should include current date in YYYYMMDD format', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toContain('20240615');
    });

    it('should start with RES- prefix', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber.startsWith('RES-')).toBe(true);
    });

    it('should generate sequential number 001 for first reservation of the day', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toBe('RES-20240615-001');
    });

    it('should generate sequential number based on existing reservations', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(5);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toBe('RES-20240615-006');
    });

    it('should pad sequential number with leading zeros', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(9);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toBe('RES-20240615-010');
    });

    it('should handle three-digit sequential numbers', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(99);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toBe('RES-20240615-100');
    });

    it('should query reservations for the correct tenant', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      await generateOrderNumber('specific-tenant');

      expect(prisma.reservation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'specific-tenant',
          }),
        })
      );
    });

    it('should query reservations created today only', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      await generateOrderNumber('tenant-123');

      expect(prisma.reservation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should check for existing order number to avoid collisions', async () => {
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      await generateOrderNumber('tenant-123');

      expect(prisma.reservation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderNumber: 'RES-20240615-001',
            tenantId: 'tenant-123',
          }),
        })
      );
    });

    it('should retry if order number already exists (collision)', async () => {
      // First call returns collision, second call returns no collision
      (prisma.reservation.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);
      (prisma.reservation.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing' }) // Collision
        .mockResolvedValueOnce(null); // No collision

      const orderNumber = await generateOrderNumber('tenant-123');

      // Should have called count twice due to retry
      expect(prisma.reservation.count).toHaveBeenCalledTimes(2);
      expect(orderNumber).toBe('RES-20240615-002');
    });
  });

  describe('Order number format validation', () => {
    it('should produce valid order numbers for various counts', async () => {
      const testCases = [
        { count: 0, expected: 'RES-20240615-001' },
        { count: 1, expected: 'RES-20240615-002' },
        { count: 10, expected: 'RES-20240615-011' },
        { count: 99, expected: 'RES-20240615-100' },
        { count: 999, expected: 'RES-20240615-1000' },
      ];

      for (const { count, expected } of testCases) {
        jest.clearAllMocks();
        (prisma.reservation.count as jest.Mock).mockResolvedValue(count);
        (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

        const orderNumber = await generateOrderNumber('tenant-123');

        expect(orderNumber).toBe(expected);
      }
    });
  });

  describe('Date handling', () => {
    it('should handle month boundaries correctly', async () => {
      jest.setSystemTime(new Date('2024-01-31T23:59:59Z'));
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toContain('20240131');
    });

    it('should handle year boundaries correctly', async () => {
      jest.setSystemTime(new Date('2024-12-31T23:59:59Z'));
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toContain('20241231');
    });

    it('should handle single-digit months with padding', async () => {
      jest.setSystemTime(new Date('2024-03-05T10:00:00Z'));
      (prisma.reservation.count as jest.Mock).mockResolvedValue(0);
      (prisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);

      const orderNumber = await generateOrderNumber('tenant-123');

      expect(orderNumber).toContain('20240305');
    });
  });
});
