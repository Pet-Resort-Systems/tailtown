import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Box, Dialog, DialogTitle, DialogContent, Alert } from "@mui/material";
import { reservationService } from "../../services/reservationService";
import { reservationApi } from "../../services/api";
// formatDateToYYYYMMDD imported but used in useKennelData
import {
  useKennelData,
  ExtendedResource,
  Reservation,
  KennelType,
} from "../../hooks/useKennelData";
import {
  useResponsive,
  getResponsiveDialogWidth,
} from "../../utils/responsive";
import KennelCalendarHeader from "./components/KennelCalendarHeader";
import KennelGrid from "./components/KennelGrid";
import ReservationFormWrapper from "./components/ReservationFormWrapper";

// Define the view types
type ViewType = "month" | "week" | "day";

// Define the props for the KennelCalendar component
interface KennelCalendarProps {
  onEventUpdate?: (reservation: Reservation) => void;
}

/**
 * Optimized KennelCalendar component with improved performance and maintainability
 *
 * Features:
 * - Displays kennels in rows grouped by type
 * - Shows days of the month in columns
 * - Indicates occupied kennels with reservation details
 * - Allows creating new reservations by clicking on empty cells
 * - Supports month, week, and day views
 * - Enables editing existing reservations by clicking on occupied cells
 *
 * Performance optimizations:
 * - Split into smaller, memoized components
 * - Custom hook for data management
 * - Reduced console logging
 * - Optimized re-render patterns
 */
const KennelCalendar: React.FC<KennelCalendarProps> = ({ onEventUpdate }) => {
  // Responsive hooks
  const { isMobile, isTablet } = useResponsive();

  // State for the current date and view
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<ViewType>("week");

  // State for filtering
  const [kennelTypeFilter, setKennelTypeFilter] = useState<KennelType | "ALL">(
    "ALL"
  );

  // State for the reservation form dialog
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedKennel, setSelectedKennel] = useState<ExtendedResource | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // State for drag-and-drop
  const [draggedReservation, setDraggedReservation] = useState<string | null>(
    null
  );

  // State to force refresh of kennel data
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Function to get the days to display based on the view type
  const getDaysToDisplay = useCallback((): Date[] => {
    const days: Date[] = [];
    const today = new Date(currentDate);

    switch (viewType) {
      case "day":
        days.push(new Date(today));
        break;

      case "week":
        // Start from current date (today on far left) and show 7 days forward
        for (let i = 0; i < 7; i++) {
          const day = new Date(today);
          day.setDate(today.getDate() + i);
          days.push(day);
        }
        break;

      case "month":
        // Get the last day of the month
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Add all days in the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
          days.push(new Date(today.getFullYear(), today.getMonth(), day));
        }
        break;
    }

    return days;
  }, [currentDate, viewType]);

  // Use the custom hook for data management
  const {
    kennels,
    reservations,
    loading,
    error,
    availabilityData,
    refreshData,
  } = useKennelData({
    currentDate,
    getDaysToDisplay,
    kennelTypeFilter,
    refreshTrigger: refreshKey,
  });

  // Function to check if a kennel is occupied on a specific date
  const isKennelOccupied = useCallback(
    (
      kennelId: string,
      date: Date
    ): { occupied: boolean; reservation?: Reservation } => {
      // Check reservations for this kennel on this date
      const reservation = reservations.find((res: Reservation) => {
        const resStartDate = new Date(res.startDate);
        const resEndDate = new Date(res.endDate);
        const checkDate = new Date(date);

        // Normalize dates to compare just the date part
        resStartDate.setHours(0, 0, 0, 0);
        resEndDate.setHours(23, 59, 59, 999);
        checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

        return (
          (res.resourceId === kennelId ||
            res.resource?.id === kennelId ||
            res.kennelId === kennelId ||
            res.suiteId === kennelId) &&
          checkDate >= resStartDate &&
          checkDate <= resEndDate
        );
      });

      return {
        occupied: !!reservation,
        reservation,
      };
    },
    [reservations]
  );

  // Function to fetch complete reservation data
  const fetchCompleteReservation = async (reservationId: string) => {
    try {
      const response = await reservationApi.get(
        `/api/reservations/${reservationId}`
      );
      if (response.data.status === "success") {
        // Handle nested response structure
        const reservationData =
          response.data.data?.reservation ||
          response.data.data ||
          response.data;
        return reservationData;
      } else {
        console.error(
          "Failed to fetch complete reservation data:",
          response.data
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching complete reservation data:", error);
      return null;
    }
  };

  // Handle cell click (create new reservation or edit existing)
  const handleCellClick = useCallback(
    async (kennel: ExtendedResource, date: Date, reservation?: Reservation) => {
      setSelectedKennel(kennel);

      if (reservation) {
        // If there's an existing reservation, fetch the complete data
        const completeReservation = await fetchCompleteReservation(
          reservation.id
        );

        if (completeReservation) {
          setSelectedReservation(completeReservation);
        } else {
          console.warn(
            "KennelCalendar: Could not fetch complete reservation data, using incomplete data"
          );
          setSelectedReservation(reservation);
        }
      } else {
        setSelectedReservation(null);
      }

      // Set the selected date range (default to same day for start and end)
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 1); // Default to next day for checkout

      setSelectedDate({
        start: date,
        end: endDate,
      });

      setFormError(null);
      setIsFormOpen(true);
    },
    []
  );

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (formData: any): Promise<{ reservationId?: string } | void> => {
      try {
        setFormError(null);

        let result;
        if (selectedReservation) {
          // Update existing reservation
          result = await reservationService.updateReservation(
            selectedReservation.id,
            formData
          );

          // For updates, close the form immediately
          setIsFormOpen(false);
          setSelectedKennel(null);
          setSelectedDate(null);
          setSelectedReservation(null);
        } else {
          // Create new reservation
          result = await reservationService.createReservation(formData);

          // For new reservations, DON'T close the form yet
          // The ReservationForm will handle closing after add-ons dialog is complete
          // We only refresh the calendar data here
        }

        // Refresh the calendar data
        refreshData();

        // Notify parent component if callback provided
        if (onEventUpdate && result) {
          onEventUpdate(result as Reservation);
        }

        // Return the expected format
        return { reservationId: (result as any)?.id };
      } catch (error: any) {
        console.error("Error submitting reservation form:", error);
        setFormError(error.message || "Failed to save reservation");
        throw error;
      }
    },
    [selectedReservation, refreshData, onEventUpdate]
  );

  // Handle form close
  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setSelectedKennel(null);
    setSelectedDate(null);
    setSelectedReservation(null);
    setFormError(null);
  }, []);

  // Handle today button click
  const handleTodayClick = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handle drag-and-drop reservation move
  const handleReservationDrop = useCallback(
    async (reservationId: string, targetKennelId: string, targetDate: Date) => {
      console.log("[DragDrop] handleReservationDrop called", {
        reservationId,
        targetKennelId,
        targetDate,
      });
      try {
        // Find the original reservation to calculate date shift
        const originalReservation = reservations.find(
          (r) => r.id === reservationId
        );

        // Build update payload
        const updatePayload: any = {
          resourceId: targetKennelId,
        };

        // If we have the original reservation, calculate date shift
        if (originalReservation) {
          const originalStartDate = new Date(originalReservation.startDate);
          originalStartDate.setHours(0, 0, 0, 0);

          const newTargetDate = new Date(targetDate);
          newTargetDate.setHours(0, 0, 0, 0);

          // Calculate the day difference
          const daysDiff = Math.round(
            (newTargetDate.getTime() - originalStartDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (daysDiff !== 0) {
            // Shift both start and end dates by the same amount
            const newStartDate = new Date(originalReservation.startDate);
            newStartDate.setDate(newStartDate.getDate() + daysDiff);

            const newEndDate = new Date(originalReservation.endDate);
            newEndDate.setDate(newEndDate.getDate() + daysDiff);

            updatePayload.startDate = newStartDate.toISOString();
            updatePayload.endDate = newEndDate.toISOString();

            console.log("[DragDrop] Date shift:", daysDiff, "days", {
              originalStart: originalReservation.startDate,
              newStart: updatePayload.startDate,
              originalEnd: originalReservation.endDate,
              newEnd: updatePayload.endDate,
            });
          }
        }

        console.log(
          "[DragDrop] Calling reservationService.updateReservation..."
        );
        const result = await reservationService.updateReservation(
          reservationId,
          updatePayload
        );
        console.log("[DragDrop] Update result:", result);

        // Small delay to ensure database write is complete, then refresh
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Force a complete re-render by updating the refresh key
        console.log("[DragDrop] Forcing calendar refresh...");
        setRefreshKey((prev) => prev + 1);

        // Show success feedback
        console.log(
          `Moved reservation ${reservationId} to kennel ${targetKennelId}`
        );
      } catch (error: any) {
        console.error("[DragDrop] Error moving reservation:", error);
        console.error("[DragDrop] Error details:", error.response?.data);
        setFormError(error.message || "Failed to move reservation");
      }
    },
    [reservations]
  );

  // Handle drag start
  const handleDragStart = useCallback((reservationId: string) => {
    setDraggedReservation(reservationId);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedReservation(null);
  }, []);

  // Listen for checkout completion and refresh calendar
  useEffect(() => {
    // Check if we need to refresh on mount (after checkout redirect)
    const shouldRefresh = sessionStorage.getItem("refreshCalendar");
    if (shouldRefresh === "true") {
      sessionStorage.removeItem("refreshCalendar");
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        refreshData();
      }, 500);
    }

    const handleCheckoutComplete = () => {
      refreshData();
    };

    const handleReservationComplete = () => {
      refreshData();
    };

    // Listen for both events
    window.addEventListener("reservation-created", handleCheckoutComplete);
    document.addEventListener("reservationComplete", handleReservationComplete);

    return () => {
      window.removeEventListener("reservation-created", handleCheckoutComplete);
      document.removeEventListener(
        "reservationComplete",
        handleReservationComplete
      );
    };
  }, [refreshData]);

  // Memoize the dialog title
  const dialogTitle = useMemo(() => {
    if (selectedReservation) {
      return "Edit Reservation";
    }
    return `New Reservation - ${selectedKennel?.name || "Kennel"}`;
  }, [selectedReservation, selectedKennel]);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Header with navigation and filters */}
      <KennelCalendarHeader
        currentDate={currentDate}
        viewType={viewType}
        kennelTypeFilter={kennelTypeFilter}
        onDateChange={setCurrentDate}
        onViewTypeChange={setViewType}
        onKennelTypeFilterChange={setKennelTypeFilter}
        onTodayClick={handleTodayClick}
      />

      {/* Main Calendar Grid */}
      <KennelGrid
        kennels={kennels}
        reservations={reservations}
        loading={loading}
        error={error}
        currentDate={currentDate}
        viewType={viewType}
        availabilityData={availabilityData}
        getDaysToDisplay={getDaysToDisplay}
        onCellClick={handleCellClick}
        isKennelOccupied={isKennelOccupied}
        onReservationDrop={handleReservationDrop}
        draggedReservation={draggedReservation}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />

      {/* Reservation Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={handleFormClose}
        maxWidth={isMobile ? false : "md"}
        fullWidth={!isMobile}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            maxHeight: isMobile ? "100vh" : "90vh",
            width: isMobile
              ? "100%"
              : getResponsiveDialogWidth(isMobile, isTablet),
          },
        }}
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <ReservationFormWrapper
            selectedKennel={selectedKennel}
            selectedDate={selectedDate}
            selectedReservation={selectedReservation}
            onSubmit={handleFormSubmit}
            onClose={handleFormClose}
            error={formError}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default KennelCalendar;
