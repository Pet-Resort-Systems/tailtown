import React, { memo, DragEvent } from "react";
import { TableRow, TableCell, Chip, Box, Typography } from "@mui/material";
import { ExtendedResource, Reservation } from "../../../hooks/useKennelData";

// Define the view types
type ViewType = "month" | "week" | "day";

interface KennelRowProps {
  kennel: ExtendedResource;
  days: Date[];
  viewType: ViewType;
  onCellClick: (
    kennel: ExtendedResource,
    date: Date,
    reservation?: Reservation
  ) => void;
  isKennelOccupied: (
    kennelId: string,
    date: Date
  ) => { occupied: boolean; reservation?: Reservation };
  onReservationDrop?: (
    reservationId: string,
    targetKennelId: string,
    date: Date
  ) => void;
  draggedReservation?: string | null;
  onDragStart?: (reservationId: string) => void;
  onDragEnd?: () => void;
}

/**
 * Individual kennel row component showing availability across days
 * Memoized to prevent unnecessary re-renders when other rows change
 */
const KennelRow: React.FC<KennelRowProps> = memo(
  ({
    kennel,
    days,
    viewType,
    onCellClick,
    isKennelOccupied,
    onReservationDrop,
    draggedReservation,
    onDragStart,
    onDragEnd,
  }) => {
    // Handle drag start
    const handleDragStart = (
      e: DragEvent<HTMLTableCellElement>,
      reservation: Reservation
    ) => {
      console.log("[DragDrop] Drag started for reservation:", reservation.id);
      e.dataTransfer.setData("text/plain", reservation.id);
      e.dataTransfer.effectAllowed = "move";
      if (onDragStart) {
        onDragStart(reservation.id);
      }
    };

    // Handle drag over (allow drop)
    const handleDragOver = (e: DragEvent<HTMLTableCellElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    };

    // Handle drop
    const handleDrop = (e: DragEvent<HTMLTableCellElement>, day: Date) => {
      e.preventDefault();
      e.stopPropagation();
      const reservationId = e.dataTransfer.getData("text/plain");
      console.log(
        "[DragDrop] Drop detected - reservationId:",
        reservationId,
        "targetKennel:",
        kennel.id
      );
      if (reservationId && onReservationDrop) {
        console.log("[DragDrop] Calling onReservationDrop");
        onReservationDrop(reservationId, kennel.id, day);
      } else {
        console.log("[DragDrop] Missing reservationId or onReservationDrop", {
          reservationId,
          hasCallback: !!onReservationDrop,
        });
      }
      if (onDragEnd) {
        onDragEnd();
      }
    };

    // Handle drag end
    const handleDragEnd = () => {
      if (onDragEnd) {
        onDragEnd();
      }
    };
    // Get kennel display name and size
    const kennelName =
      kennel.suiteNumber || kennel.name || `Kennel ${kennel.id}`;

    // Derive room size from type (e.g., JUNIOR_KENNEL -> JUNIOR, QUEEN_KENNEL -> QUEEN)
    const getRoomSizeFromType = (type: string | undefined): string => {
      if (!type) return "JUNIOR";
      if (type.includes("JUNIOR")) return "JUNIOR";
      if (type.includes("QUEEN")) return "QUEEN";
      if (type.includes("KING")) return "KING";
      if (type.includes("VIP")) return "VIP";
      if (type.includes("CAT")) return "CAT";
      return "JUNIOR";
    };

    const roomSize = kennel.size || getRoomSizeFromType(kennel.type);

    // Get size display and color based on room size
    const getSizeDisplay = (size: string) => {
      switch (size) {
        case "JUNIOR":
          return { label: "Junior (1)", color: "default" as const };
        case "QUEEN":
          return { label: "Queen (2)", color: "primary" as const };
        case "KING":
          return { label: "King (3)", color: "secondary" as const };
        case "VIP":
          return { label: "VIP (4)", color: "error" as const };
        case "CAT":
          return { label: "Cat (1)", color: "info" as const };
        case "OVERFLOW":
          return { label: "Overflow", color: "warning" as const };
        default:
          return { label: "Junior (1)", color: "default" as const };
      }
    };

    const typeInfo = getSizeDisplay(roomSize);

    // Function to get the status color (restored from legacy)
    const getStatusColor = (status: string): string => {
      switch (status) {
        case "CONFIRMED":
          return "#4caf50"; // Green
        case "CHECKED_IN":
          return "#2196f3"; // Blue
        case "PENDING":
          return "#ff9800"; // Orange
        case "CHECKED_OUT":
          return "#9c27b0"; // Purple
        case "COMPLETED":
          return "#4caf50"; // Green
        case "CANCELLED":
          return "#f44336"; // Red
        case "NO_SHOW":
          return "#f44336"; // Red
        default:
          return "#9e9e9e"; // Grey
      }
    };

    // Get cell styling based on occupancy and availability (restored legacy styling)
    const getCellStyle = (
      occupied: boolean,
      available: boolean,
      isToday: boolean,
      isWeekend: boolean,
      reservation?: any
    ) => {
      let backgroundColor = "inherit";
      let cursor = "pointer";
      let border = "1px solid rgba(224, 224, 224, 1)";

      if (reservation) {
        // Check if service category is DAYCARE - use orange, otherwise use blue tint
        const isDaycare = reservation.service?.serviceCategory === "DAYCARE";
        if (isDaycare) {
          backgroundColor = "rgba(255, 152, 0, 0.12)"; // Orange tint for DAYCARE
        } else {
          // Use consistent blue tint for BOARDING (not status-based)
          backgroundColor = "rgba(33, 150, 243, 0.12)"; // Blue tint for BOARDING
        }
      } else if (!available) {
        backgroundColor = "rgba(200, 200, 200, 0.1)"; // Light grey for unavailable
      } else if (isWeekend) {
        backgroundColor = "rgba(0, 0, 0, 0.04)"; // Light grey for weekends
      }

      // Add subtle highlight for today's column
      if (isToday) {
        backgroundColor =
          backgroundColor === "inherit"
            ? "rgba(25, 118, 210, 0.04)" // Very light blue for today if empty
            : backgroundColor; // Keep existing color if occupied
      }

      return {
        backgroundColor,
        cursor,
        borderBottom: border,
        borderLeft: isToday ? "2px solid rgba(25, 118, 210, 0.3)" : border,
        borderRight: isToday ? "2px solid rgba(25, 118, 210, 0.3)" : "none",
        p: 0.5,
        height: 45,
        position: "relative" as const,
        "&:hover": {
          backgroundColor:
            occupied && reservation
              ? reservation.service?.serviceCategory === "DAYCARE"
                ? "rgba(255, 152, 0, 0.20)" // Darker orange on hover for DAYCARE
                : "rgba(33, 150, 243, 0.20)" // Darker blue on hover for BOARDING
              : "rgba(0, 0, 0, 0.08)",
        },
      };
    };

    // Format reservation display text
    const formatReservationText = (reservation: Reservation) => {
      if (!reservation) return "";

      // Try to get customer name from different possible locations
      const customerName = reservation.customer?.firstName
        ? `${reservation.customer.firstName} ${
            reservation.customer.lastName || ""
          }`.trim()
        : "Guest";

      // Try to get pet name from different possible locations
      const petName = reservation.pet?.name || "Pet";

      return `${customerName} - ${petName}`;
    };

    return (
      <TableRow hover>
        {/* Kennel Name Cell */}
        <TableCell
          sx={{
            fontWeight: "bold",
            backgroundColor: "background.paper",
            position: "sticky",
            left: 0,
            zIndex: 2,
            borderRight: "2px solid rgba(224, 224, 224, 1)",
          }}
        >
          <Box>
            <Typography variant="body2" fontWeight="bold">
              {kennelName}
            </Typography>
            <Chip
              label={typeInfo.label}
              color={typeInfo.color}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </TableCell>

        {/* Day Cells */}
        {days.map((day, dayIndex) => {
          const occupancyInfo = isKennelOccupied(kennel.id, day);
          const isToday = day.toDateString() === new Date().toDateString();

          // Check if there are occupying reservations for this kennel on this specific date
          const occupyingReservations =
            (kennel as any).occupyingReservations || [];
          const daySpecificReservations = occupyingReservations.filter(
            (res: any) => {
              const resStartDate = new Date(res.startDate);
              const resEndDate = new Date(res.endDate);
              const checkDate = new Date(day);

              // Normalize dates to compare just the date part
              resStartDate.setHours(0, 0, 0, 0);
              resEndDate.setHours(23, 59, 59, 999);
              checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

              return checkDate >= resStartDate && checkDate <= resEndDate;
            }
          );

          const hasOccupyingReservation = daySpecificReservations.length > 0;
          const isAvailable =
            !occupancyInfo.occupied && !hasOccupyingReservation;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const activeReservation =
            occupancyInfo.reservation ||
            (hasOccupyingReservation ? daySpecificReservations[0] : undefined);

          return (
            <TableCell
              key={dayIndex}
              align="center"
              draggable={!!activeReservation}
              onDragStart={
                activeReservation
                  ? (e) => handleDragStart(e, activeReservation)
                  : undefined
              }
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
              sx={{
                ...getCellStyle(
                  occupancyInfo.occupied,
                  isAvailable,
                  isToday,
                  isWeekend,
                  activeReservation
                ),
                // Add visual feedback when dragging
                ...(draggedReservation &&
                  !activeReservation && {
                    border: "2px dashed #1976d2",
                    backgroundColor: "rgba(25, 118, 210, 0.08)",
                  }),
                // Cursor style for draggable cells
                cursor: activeReservation ? "grab" : "pointer",
                "&:active": activeReservation ? { cursor: "grabbing" } : {},
              }}
              onClick={() => onCellClick(kennel, day, activeReservation)}
            >
              {activeReservation ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    justifyContent: "center",
                    pointerEvents: "none", // Prevent child elements from interfering with drag
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 0.25,
                    }}
                  >
                    <Chip
                      label={activeReservation.status}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(activeReservation.status),
                        color: "white",
                        fontSize: "0.6rem",
                        height: 16,
                        "& .MuiChip-label": { px: 0.5 },
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    display="block"
                    noWrap
                    sx={{ fontSize: "0.7rem" }}
                  >
                    {activeReservation.pet?.name || "Unknown Pet"}
                  </Typography>
                </Box>
              ) : !isAvailable ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                    Unavailable
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                    •
                  </Typography>
                </Box>
              )}
            </TableCell>
          );
        })}
      </TableRow>
    );
  }
);

KennelRow.displayName = "KennelRow";

export default KennelRow;
