import { renderHook, waitFor } from '@testing-library/react';
import { useKennelData } from '../useKennelData';
import { resourceService } from '../../services/resourceService';
import { reservationApi } from '../../services/api';

// Mock the services
jest.mock('../../services/resourceService');
jest.mock('../../services/api');

describe('useKennelData - Reservation Status Filtering', () => {
  const mockResourceService = resourceService as jest.Mocked<
    typeof resourceService
  >;
  const mockReservationApi = reservationApi as jest.Mocked<
    typeof reservationApi
  >;

  const defaultProps = {
    currentDate: new Date(),
    getDaysToDisplay: () => {
      const days = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        days.push(day);
      }
      return days;
    },
    kennelTypeFilter: 'ALL' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for resources
    mockResourceService.getAllResources.mockResolvedValue({
      status: 'success',
      data: [{ id: 'resource-1', name: 'A01R', type: 'JUNIOR_KENNEL' }],
    } as any);

    // Default mock for availability batch
    mockReservationApi.post.mockResolvedValue({
      data: {
        data: {
          resources: [{ resourceId: 'resource-1', isAvailable: true }],
        },
      },
    } as any);
  });

  describe('Pending/Draft Reservation Filtering', () => {
    it('should filter out PENDING reservations from calendar display', async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      mockReservationApi.get.mockResolvedValue({
        data: {
          status: 'success',
          data: [
            {
              id: '1',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'PENDING', // Unpaid - should be filtered out
            },
            {
              id: '2',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CONFIRMED', // Paid - should be included
            },
          ],
        },
      } as any);

      const { result } = renderHook(() => useKennelData(defaultProps));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have 1 reservation (CONFIRMED), not 2
      expect(result.current.reservations).toHaveLength(1);
      expect(result.current.reservations[0].status).toBe('CONFIRMED');
    });

    it('should filter out DRAFT reservations from calendar display', async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      mockReservationApi.get.mockResolvedValue({
        data: {
          status: 'success',
          data: [
            {
              id: '1',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'DRAFT', // Incomplete - should be filtered out
            },
            {
              id: '2',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CHECKED_IN', // Active - should be included
            },
          ],
        },
      } as any);

      const { result } = renderHook(() => useKennelData(defaultProps));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have 1 reservation (CHECKED_IN), not 2
      expect(result.current.reservations).toHaveLength(1);
      expect(result.current.reservations[0].status).toBe('CHECKED_IN');
    });

    it('should filter out CANCELLED and NO_SHOW reservations from calendar display', async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      mockReservationApi.get.mockResolvedValue({
        data: {
          status: 'success',
          data: [
            {
              id: '1',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CANCELLED',
            },
            {
              id: '2',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'NO_SHOW',
            },
            {
              id: '3',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CONFIRMED',
            },
          ],
        },
      } as any);

      const { result } = renderHook(() => useKennelData(defaultProps));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have 1 reservation (CONFIRMED)
      expect(result.current.reservations).toHaveLength(1);
      expect(result.current.reservations[0].status).toBe('CONFIRMED');
    });

    it('should include CONFIRMED, CHECKED_IN, CHECKED_OUT, and COMPLETED reservations', async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      mockReservationApi.get.mockResolvedValue({
        data: {
          status: 'success',
          data: [
            {
              id: '1',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CONFIRMED',
            },
            {
              id: '2',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CHECKED_IN',
            },
            {
              id: '3',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CHECKED_OUT',
            },
            {
              id: '4',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'COMPLETED',
            },
            {
              id: '5',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'PENDING',
            },
            {
              id: '6',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'DRAFT',
            },
            {
              id: '7',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'CANCELLED',
            },
            {
              id: '8',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'NO_SHOW',
            },
          ],
        },
      } as any);

      const { result } = renderHook(() => useKennelData(defaultProps));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have 4 reservations (excluding PENDING, DRAFT, CANCELLED, NO_SHOW)
      expect(result.current.reservations).toHaveLength(4);

      const statuses = result.current.reservations.map((r: any) => r.status);
      expect(statuses).toContain('CONFIRMED');
      expect(statuses).toContain('CHECKED_IN');
      expect(statuses).toContain('CHECKED_OUT');
      expect(statuses).toContain('COMPLETED');
      expect(statuses).not.toContain('PENDING');
      expect(statuses).not.toContain('DRAFT');
      expect(statuses).not.toContain('CANCELLED');
      expect(statuses).not.toContain('NO_SHOW');
    });

    it('should handle case-insensitive status filtering', async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      mockReservationApi.get.mockResolvedValue({
        data: {
          status: 'success',
          data: [
            {
              id: '1',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'pending', // lowercase - should still be filtered out
            },
            {
              id: '2',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'Pending', // mixed case - should still be filtered out
            },
            {
              id: '3',
              resourceId: 'resource-1',
              startDate: `${todayStr}T12:00:00.000Z`,
              endDate: `${todayStr}T18:00:00.000Z`,
              status: 'confirmed', // lowercase - should be included
            },
          ],
        },
      } as any);

      const { result } = renderHook(() => useKennelData(defaultProps));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have 1 reservation (confirmed)
      expect(result.current.reservations).toHaveLength(1);
    });
  });
});
