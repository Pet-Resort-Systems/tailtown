import { renderHook, waitFor } from "@testing-library/react";
import { useDashboardData } from "../useDashboardData";
import { reservationService } from "../../services/reservationService";

// Mock the services
jest.mock("../../services/reservationService");
jest.mock("../../utils/logger");

describe("useDashboardData - Timezone Tests", () => {
  const mockReservationService = reservationService as jest.Mocked<
    typeof reservationService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Date Filtering with Different Timezones", () => {
    it("should fetch all reservations without server-side date filtering", async () => {
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          12,
          0,
          0
        )
      );

      const mockReservations = [
        {
          id: "1",
          startDate: todayUTC.toISOString(),
          endDate: new Date(todayUTC.getTime() + 86400000).toISOString(),
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      mockReservationService.getTodayRevenue.mockResolvedValue({
        data: 0,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify API was called without date parameter
      expect(mockReservationService.getAllReservations).toHaveBeenCalledWith(
        1,
        250,
        "startDate",
        "asc",
        expect.any(String)
      );
      // Should NOT have a 6th parameter (date filter)
      expect(
        mockReservationService.getAllReservations
      ).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.any(String)
      );
    });

    it("should correctly filter check-ins for today regardless of timezone", async () => {
      // Create a date that is "today" in UTC
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          12,
          0,
          0 // Noon UTC
        )
      );

      // Create a date that is "yesterday" in UTC but might be "today" in some timezones
      const yesterdayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - 1,
          23,
          0,
          0 // 11 PM UTC yesterday
        )
      );

      // Create a date that is "tomorrow" in UTC but might be "today" in some timezones
      const tomorrowUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() + 1,
          1,
          0,
          0 // 1 AM UTC tomorrow
        )
      );

      const mockReservations = [
        {
          id: "1",
          startDate: todayUTC.toISOString(),
          endDate: new Date(todayUTC.getTime() + 86400000).toISOString(),
          status: "CONFIRMED",
        },
        {
          id: "2",
          startDate: yesterdayUTC.toISOString(),
          endDate: todayUTC.toISOString(),
          status: "CONFIRMED",
        },
        {
          id: "3",
          startDate: tomorrowUTC.toISOString(),
          endDate: new Date(tomorrowUTC.getTime() + 86400000).toISOString(),
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      mockReservationService.getTodayRevenue.mockResolvedValue({
        data: 0,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Filter for check-ins (starting today)
      result.current.filterReservations("in");

      await waitFor(() => {
        // Should only show reservation #1 (starts today in UTC)
        expect(result.current.filteredReservations).toHaveLength(1);
        expect(result.current.filteredReservations[0].id).toBe("1");
      });
    });

    it("should correctly filter check-outs for today regardless of timezone", async () => {
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          12,
          0,
          0
        )
      );

      const yesterdayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - 1,
          12,
          0,
          0
        )
      );

      const mockReservations = [
        {
          id: "1",
          startDate: yesterdayUTC.toISOString(),
          endDate: todayUTC.toISOString(),
          status: "CONFIRMED",
        },
        {
          id: "2",
          startDate: new Date(yesterdayUTC.getTime() - 86400000).toISOString(),
          endDate: yesterdayUTC.toISOString(),
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      mockReservationService.getTodayRevenue.mockResolvedValue({
        data: 0,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Filter for check-outs (ending today)
      result.current.filterReservations("out");

      await waitFor(() => {
        // Should only show reservation #1 (ends today in UTC)
        expect(result.current.filteredReservations).toHaveLength(1);
        expect(result.current.filteredReservations[0].id).toBe("1");
      });
    });

    it("should correctly calculate overnight count across timezone boundaries", async () => {
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          12,
          0,
          0
        )
      );

      const yesterdayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - 1,
          12,
          0,
          0
        )
      );

      const tomorrowUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() + 1,
          12,
          0,
          0
        )
      );

      const mockReservations = [
        {
          id: "1",
          startDate: yesterdayUTC.toISOString(),
          endDate: tomorrowUTC.toISOString(),
          status: "CONFIRMED",
        },
        {
          id: "2",
          startDate: todayUTC.toISOString(),
          endDate: tomorrowUTC.toISOString(),
          status: "CONFIRMED",
        },
        {
          id: "3",
          startDate: yesterdayUTC.toISOString(),
          endDate: todayUTC.toISOString(),
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      mockReservationService.getTodayRevenue.mockResolvedValue({
        data: 0,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Overnight count should be 1 (only reservation #1 started before today and ends on/after today)
      expect(result.current.overnightCount).toBe(1);
    });

    it("should handle edge case: reservation at midnight UTC", async () => {
      const today = new Date();
      const midnightTodayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          0,
          0,
          0 // Exactly midnight
        )
      );

      const mockReservations = [
        {
          id: "1",
          startDate: midnightTodayUTC.toISOString(),
          endDate: new Date(
            midnightTodayUTC.getTime() + 86400000
          ).toISOString(),
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      mockReservationService.getTodayRevenue.mockResolvedValue({
        data: 0,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should count as check-in today
      expect(result.current.inCount).toBe(1);
    });

    it("should handle edge case: reservation ending at 23:59:59 UTC", async () => {
      const today = new Date();
      const almostMidnightUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          23,
          59,
          59 // One second before midnight
        )
      );

      const yesterdayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - 1,
          12,
          0,
          0
        )
      );

      const mockReservations = [
        {
          id: "1",
          startDate: yesterdayUTC.toISOString(),
          endDate: almostMidnightUTC.toISOString(),
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      mockReservationService.getTodayRevenue.mockResolvedValue({
        data: 0,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should NOT count as check-out today (ends before midnight)
      expect(result.current.outCount).toBe(0);
    });
  });

  describe("Pending/Draft Reservation Filtering", () => {
    it("should filter out PENDING reservations from display", async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const mockReservations = [
        {
          id: "1",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "PENDING", // Unpaid - should be filtered out
        },
        {
          id: "2",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "CONFIRMED", // Paid - should be included
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have 1 reservation (CONFIRMED), not 2
      expect(result.current.allReservations).toHaveLength(1);
      expect(result.current.allReservations[0].status).toBe("CONFIRMED");
    });

    it("should filter out DRAFT reservations from display", async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const mockReservations = [
        {
          id: "1",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "DRAFT", // Incomplete - should be filtered out
        },
        {
          id: "2",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "CHECKED_IN", // Active - should be included
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have 1 reservation (CHECKED_IN), not 2
      expect(result.current.allReservations).toHaveLength(1);
      expect(result.current.allReservations[0].status).toBe("CHECKED_IN");
    });

    it("should include CONFIRMED, CHECKED_IN, CHECKED_OUT, and COMPLETED reservations", async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const mockReservations = [
        {
          id: "1",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "CONFIRMED",
        },
        {
          id: "2",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "CHECKED_IN",
        },
        {
          id: "3",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "CHECKED_OUT",
        },
        {
          id: "4",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "COMPLETED",
        },
        {
          id: "5",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "PENDING",
        },
        {
          id: "6",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "DRAFT",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have 4 reservations (excluding PENDING and DRAFT)
      expect(result.current.allReservations).toHaveLength(4);
      const statuses = result.current.allReservations.map((r: any) => r.status);
      expect(statuses).toContain("CONFIRMED");
      expect(statuses).toContain("CHECKED_IN");
      expect(statuses).toContain("CHECKED_OUT");
      expect(statuses).toContain("COMPLETED");
      expect(statuses).not.toContain("PENDING");
      expect(statuses).not.toContain("DRAFT");
    });

    it("should not count PENDING reservations in check-in metrics", async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const mockReservations = [
        {
          id: "1",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "PENDING",
        },
        {
          id: "2",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "PENDING",
        },
        {
          id: "3",
          startDate: `${todayStr}T12:00:00.000Z`,
          endDate: `${todayStr}T18:00:00.000Z`,
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only count 1 check-in (the CONFIRMED one), not 3
      expect(result.current.inCount).toBe(1);
    });
  });

  describe("Timezone Consistency", () => {
    it("should use UTC dates consistently across all calculations", async () => {
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          12,
          0,
          0
        )
      );

      const mockReservations = [
        {
          id: "1",
          startDate: todayUTC.toISOString(),
          endDate: new Date(todayUTC.getTime() + 86400000).toISOString(),
          status: "CONFIRMED",
        },
      ];

      mockReservationService.getAllReservations.mockResolvedValue({
        data: mockReservations,
      } as any);

      mockReservationService.getTodayRevenue.mockResolvedValue({
        data: 100,
      } as any);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify counts are consistent
      expect(result.current.inCount).toBe(1);
      expect(result.current.outCount).toBe(0);
      expect(result.current.overnightCount).toBe(0);

      // Verify filtering produces same results
      result.current.filterReservations("in");

      await waitFor(() => {
        expect(result.current.filteredReservations).toHaveLength(1);
      });
    });
  });
});
