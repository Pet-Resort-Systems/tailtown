import { useState, useEffect, useCallback } from "react";
import { reservationService } from "../services/reservationService";
import { logger } from "../utils/logger";
import { getTenantTimezone } from "../config";
import { enhanceReservationsWithVaccinationIcons } from "../utils/vaccinationIconUtils";

interface DashboardMetrics {
  inCount: number | null;
  outCount: number | null;
  overnightCount: number | null;
}

/**
 * useDashboardData Hook
 *
 * Custom hook for managing all dashboard data fetching, filtering, and state management.
 * Provides a clean separation between data logic and UI components.
 *
 * Features:
 * - Parallel API calls for reservations and revenue
 * - Client-side metric calculations (check-ins, check-outs, overnight)
 * - Real-time filtering without re-fetching
 * - Auto-refresh on window focus
 * - UTC-based date comparisons for timezone consistency
 * - Error handling with user-friendly messages
 *
 * Performance Optimizations:
 * - useCallback with empty deps to prevent infinite loops
 * - Single data fetch on mount (fetches all active reservations)
 * - Memoized filter function
 * - Efficient UTC date calculations
 * - Client-side filtering (no API calls for filter changes)
 *
 * Date Handling:
 * - Fetches all active reservations (no server-side date filtering)
 * - Uses UTC date methods for consistent timezone handling
 * - Filters check-ins/check-outs based on UTC date comparison
 * - Default filter shows all active reservations
 *
 * @returns {Object} Dashboard data and control functions
 * @returns {number|null} inCount - Number of check-ins today (UTC)
 * @returns {number|null} outCount - Number of check-outs today (UTC)
 * @returns {number|null} overnightCount - Number of overnight guests
 * @returns {Reservation[]} allReservations - All fetched reservations
 * @returns {Reservation[]} filteredReservations - Filtered reservations based on current filter
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message if any
 * @returns {'in'|'out'|'all'} appointmentFilter - Current filter state (default: 'all')
 * @returns {Function} filterReservations - Function to change filter
 * @returns {Function} refreshData - Function to manually refresh data
 *
 * @example
 * const {
 *   inCount,
 *   filteredReservations,
 *   loading,
 *   filterReservations
 * } = useDashboardData();
 */
export const useDashboardData = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    inCount: null,
    outCount: null,
    overnightCount: null,
  });

  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointmentFilter, setAppointmentFilter] = useState<
    "in" | "out" | "all"
  >("in"); // Default to check-ins (today's appointments)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Always default to today

  /**
   * Convert UTC date to local date string in tenant's timezone
   * This ensures dates are compared in the business's local time, not UTC
   */
  const getLocalDateString = useCallback((utcDateString: string): string => {
    const date = new Date(utcDateString);
    const timezone = getTenantTimezone();

    // Format date in tenant's timezone
    const localDate = new Date(
      date.toLocaleString("en-US", { timeZone: timezone })
    );
    return `${localDate.getFullYear()}-${String(
      localDate.getMonth() + 1
    ).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
  }, []);

  /**
   * Filter reservations based on check-in or check-out status
   *
   * Performs client-side filtering for instant updates without API calls.
   * Compares dates in YYYY-MM-DD format to handle timezone correctly.
   *
   * @param filter - Filter type: 'in' (check-ins), 'out' (check-outs), or 'all' (both for selected date)
   * @param reservations - Optional array to filter (defaults to allReservations)
   */
  const filterReservations = useCallback(
    (filter: "in" | "out" | "all", reservations?: any[]) => {
      const reservationsToFilter = reservations || allReservations;

      // Use selected date for filtering (in local timezone)
      const formattedDate = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      let filtered = reservationsToFilter;

      if (filter === "in") {
        // Show only check-ins (reservations starting on selected date in local timezone)
        filtered = reservationsToFilter.filter((res: any) => {
          const startDateStr = getLocalDateString(res.startDate);
          return startDateStr === formattedDate;
        });
      } else if (filter === "out") {
        // Show only check-outs (reservations ending on selected date in local timezone)
        filtered = reservationsToFilter.filter((res: any) => {
          const endDateStr = getLocalDateString(res.endDate);
          return endDateStr === formattedDate;
        });
      } else if (filter === "all") {
        // Show both check-ins AND check-outs for selected date in local timezone
        filtered = reservationsToFilter.filter((res: any) => {
          const startDateStr = getLocalDateString(res.startDate);
          const endDateStr = getLocalDateString(res.endDate);
          return startDateStr === formattedDate || endDateStr === formattedDate;
        });
      }

      setFilteredReservations(filtered);
      setAppointmentFilter(filter);
    },
    [allReservations, selectedDate, getLocalDateString]
  );

  /**
   * Load all dashboard data
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use selected date for calculations
      const formattedDate = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      console.log("[Dashboard] Loading data for date:", formattedDate);

      // Fetch all statuses including COMPLETED for displaying past reservations
      // We'll filter out COMPLETED when calculating counts to match Gingr's "Expected" totals
      const allStatuses = "PENDING,CONFIRMED,CHECKED_IN,COMPLETED,CANCELLED,NO_SHOW";

      // Fetch reservations with pagination (up to 2 pages = 1000 reservations)
      // Include date filter to get reservations for a reasonable window around the selected date
      console.log("[Dashboard] Fetching reservations...");
      let allReservations: any[] = [];
      for (let page = 1; page <= 2; page++) {
        const pageResponse = await reservationService.getAllReservations(
          page,
          500,
          "startDate",
          "asc",
          allStatuses, // Fetch all statuses for display
          formattedDate // Pass the selected date to filter reservations
        );
        console.log(`[Dashboard] Page ${page} response:`, pageResponse);

        // Extract reservations from response
        const resResponse = pageResponse as any;
        let pageReservations: any[] = [];
        if (resResponse?.data && Array.isArray(resResponse.data)) {
          pageReservations = resResponse.data;
        } else if (
          resResponse?.data?.data &&
          Array.isArray(resResponse.data.data)
        ) {
          pageReservations = resResponse.data.data;
        } else if (
          resResponse?.data?.reservations &&
          Array.isArray(resResponse.data.reservations)
        ) {
          pageReservations = resResponse.data.reservations;
        }

        allReservations = allReservations.concat(pageReservations);
        console.log(
          `[Dashboard] Page ${page}: ${pageReservations.length} reservations, total: ${allReservations.length}`
        );

        if (!resResponse?.pagination?.hasNextPage) break;
      }

      let reservations = allReservations;
      const reservationsResponse = { data: { reservations: allReservations } };
      console.log(
        "[Dashboard] Total reservations fetched:",
        allReservations.length
      );

      console.log(
        "[Dashboard] Extracted reservations:",
        reservations.length,
        "reservations"
      );

      // Enhance reservations with vaccination icons
      const enhancedReservations =
        enhanceReservationsWithVaccinationIcons(reservations);
      console.log("[Dashboard] Enhanced reservations with vaccination icons");

      // Calculate metrics using local timezone dates

      const checkIns = enhancedReservations.filter((res: any) => {
        if (res.status === 'CANCELLED') return false;
        const startDateStr = getLocalDateString(res.startDate);
        return startDateStr === formattedDate;
      }).length;

      const checkOuts = enhancedReservations.filter((res: any) => {
        if (res.status === 'CANCELLED') return false;
        const endDateStr = getLocalDateString(res.endDate);
        return endDateStr === formattedDate;
      }).length;

      // Debug: Check service data
      const sampleWithService = enhancedReservations.find(
        (r: any) => r.service
      );
      const sampleWithoutService = enhancedReservations.find(
        (r: any) => !r.service
      );
      console.log("[Dashboard] Service data check:", {
        totalReservations: enhancedReservations.length,
        withService: enhancedReservations.filter((r: any) => r.service).length,
        withoutService: enhancedReservations.filter((r: any) => !r.service)
          .length,
        sampleWithService: sampleWithService
          ? {
              pet: sampleWithService.pet?.name,
              service: sampleWithService.service?.name,
              category: sampleWithService.service?.serviceCategory,
            }
          : "none",
        sampleWithoutService: sampleWithoutService
          ? {
              pet: sampleWithoutService.pet?.name,
              serviceId: sampleWithoutService.serviceId,
            }
          : "none",
      });

      const overnight = enhancedReservations.filter((res: any) => {
        if (res.status === 'CANCELLED') return false;
        // Only count boarding reservations as overnight, not day camp
        const serviceCategory = res.service?.serviceCategory;
        if (serviceCategory !== "BOARDING") return false;

        const startDateStr = getLocalDateString(res.startDate);
        const endDateStr = getLocalDateString(res.endDate);
        return startDateStr <= formattedDate && endDateStr > formattedDate;
      }).length;

      console.log("[Dashboard] Calculated metrics:", {
        checkIns,
        checkOuts,
        overnight,
        totalReservations: enhancedReservations.length,
      });

      setMetrics({
        inCount: checkIns,
        outCount: checkOuts,
        overnightCount: overnight,
      });

      setAllReservations(enhancedReservations);

      // Apply initial filter (check-ins by default to show today's appointments in local timezone)
      const checkInsToday = enhancedReservations.filter((res: any) => {
        const startDateStr = getLocalDateString(res.startDate);
        return startDateStr === formattedDate;
      });
      setFilteredReservations(checkInsToday);
    } catch (err: any) {
      logger.error("Failed to load dashboard data", { error: err.message });
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, getLocalDateString]); // Reload when date changes

  // Load data on mount and when date changes
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]); // Reload when date changes

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      logger.debug("Window focused, refreshing dashboard");
      loadData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadData is stable, no need in deps

  return {
    ...metrics,
    allReservations,
    filteredReservations,
    loading,
    error,
    appointmentFilter,
    selectedDate,
    setSelectedDate,
    filterReservations,
    refreshData: loadData,
  };
};
