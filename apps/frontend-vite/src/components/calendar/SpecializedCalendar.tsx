import React, { useState, useEffect, useCallback } from "react";
import "./Calendar.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";

import {
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
} from "@mui/material";
import { reservationService } from "../../services/reservationService";
import schedulingService from "../../services/schedulingService";
import ReservationForm from "../reservations/ReservationForm";
import { Reservation } from "../../services/reservationService";
import { ServiceCategory } from "../../types/service";

/**
 * Props for the SpecializedCalendar component
 */
interface SpecializedCalendarProps {
  /**
   * Optional callback function called when a reservation is created or updated
   * @param reservation - The newly created or updated reservation
   */
  onEventUpdate?: (reservation: Reservation) => void;

  /**
   * Optional service categories to filter reservations by
   * If provided, only reservations with these service categories will be shown
   */
  serviceCategories?: string[];

  /**
   * Optional title for the calendar
   */
  calendarTitle?: string;

  /**
   * Optional staff ID to filter reservations by
   * If provided, only reservations assigned to this staff member will be shown
   */
  staffId?: string;
}

/**
 * Specialized Calendar component for grooming and training views
 *
 * This component fixes the time formatting issues with FullCalendar
 * while maintaining the same functionality as the original Calendar component.
 *
 * @component
 */
const SpecializedCalendar: React.FC<SpecializedCalendarProps> = ({
  onEventUpdate,
  serviceCategories,
  calendarTitle,
  staffId,
}) => {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Reservation | null>(null);

  const loadReservations = useCallback(async () => {
    try {
      const allEvents: EventInput[] = [];

      // Get all relevant reservations (PENDING, CONFIRMED or CHECKED_IN)
      // Don't filter by date - let the calendar show all upcoming reservations
      const response = await reservationService.getAllReservations(
        1, // page
        500, // limit - increased to show more reservations (was 100)
        "startDate", // sortBy
        "asc", // sortOrder - ascending to get earliest first
        "PENDING,CONFIRMED,CHECKED_IN", // status - include pending reservations too
        undefined, // date - don't filter by single date
        undefined, // checkInDate
        undefined // timezone
      );

      // Handle both response formats:
      // Format 1: { status: "success", data: { reservations: [...] } }
      // Format 2: { status: "success", data: [...] } (direct array)
      const responseData = (response as any)?.data;
      const reservationsArray = Array.isArray(responseData)
        ? responseData
        : responseData?.reservations;

      console.log("SpecializedCalendar loadReservations response:", {
        status: response?.status,
        dataIsArray: Array.isArray(responseData),
        reservationsCount: reservationsArray?.length,
      });

      if (
        response?.status === "success" &&
        reservationsArray &&
        Array.isArray(reservationsArray)
      ) {
        // Filter reservations by service category and/or staff ID if specified
        let filteredReservations = reservationsArray;

        // Filter by service category
        if (serviceCategories && serviceCategories.length > 0) {
          console.log("Filtering by serviceCategories:", serviceCategories);
          console.log(
            "Sample reservations before filter:",
            reservationsArray.slice(0, 3).map((r: any) => ({
              id: r.id,
              serviceCategory: r.service?.serviceCategory,
              serviceName: r.service?.name,
            }))
          );

          filteredReservations = filteredReservations.filter(
            (reservation: any) => {
              // Check if the reservation's service category matches any of the specified categories
              if (
                !reservation.service ||
                typeof reservation.service !== "object"
              ) {
                return false;
              }

              // Safely access the serviceCategory property
              const serviceObj = reservation.service as any;
              if (!serviceObj.serviceCategory) {
                return false;
              }

              // serviceCategory is used in the includes check below
              return serviceCategories.includes(serviceObj.serviceCategory);
            }
          );

          console.log(
            "After service category filter:",
            filteredReservations.length
          );
        }

        // Filter by staff ID if specified
        // Note: Also shows unassigned appointments (staffAssignedId is null/undefined)
        // so groomers can see and claim them
        if (staffId) {
          console.log("Filtering by staffId:", staffId);
          console.log(
            "All reservations:",
            filteredReservations.map((r: any) => ({
              id: r.id,
              pet: r.pet?.name,
              staffAssignedId: r.staffAssignedId,
              service: r.service?.name,
            }))
          );

          filteredReservations = filteredReservations.filter(
            (reservation: any) =>
              reservation.staffAssignedId === staffId ||
              !reservation.staffAssignedId
          );

          console.log(
            "After filtering:",
            filteredReservations.length,
            "reservations"
          );
        }

        const calendarEvents = filteredReservations.map((reservation: any) => {
          // Add "(Unassigned)" label for grooming appointments without a groomer
          const isGrooming =
            reservation.service?.serviceCategory === "GROOMING";
          const isUnassigned = isGrooming && !reservation.staffAssignedId;
          const unassignedLabel = isUnassigned ? " (Unassigned)" : "";

          return {
            id: reservation.id,
            title: `${reservation.pet?.name || "Pet"} - ${
              reservation.service?.name || "Service"
            }${unassignedLabel}`,
            start: reservation.startDate,
            end: reservation.endDate,
            backgroundColor: getStatusColor(reservation.status),
            borderColor: getStatusColor(reservation.status),
            textColor: "#ffffff",
            extendedProps: {
              reservation,
              type: "reservation",
            },
          };
        });

        allEvents.push(...calendarEvents);
      } else {
        console.warn(
          "SpecializedCalendar: Invalid response format or no reservations found"
        );
      }

      // Load training class sessions if showing training calendar
      if (
        serviceCategories &&
        serviceCategories.includes(ServiceCategory.TRAINING)
      ) {
        console.log("Loading training classes for calendar...");
        try {
          const classesResponse =
            await schedulingService.trainingClasses.getAll({
              isActive: true,
            });

          console.log("Training classes response:", classesResponse);

          if (classesResponse && Array.isArray(classesResponse)) {
            console.log(`Found ${classesResponse.length} training classes`);
            // For each class, get its sessions
            for (const trainingClass of classesResponse) {
              try {
                console.log(
                  `Loading sessions for class: ${trainingClass.name} (${trainingClass.id})`
                );
                const sessionsResponse =
                  await schedulingService.trainingClasses.getSessions(
                    trainingClass.id
                  );

                console.log(
                  `Sessions for ${trainingClass.name}:`,
                  sessionsResponse
                );

                if (sessionsResponse && Array.isArray(sessionsResponse)) {
                  console.log(
                    `Creating ${sessionsResponse.length} session events`
                  );
                  const sessionEvents = sessionsResponse.map((session: any) => {
                    // The scheduledDate comes from the backend as an ISO string in UTC
                    // e.g., "2024-11-04T00:00:00.000Z" which represents midnight UTC on Nov 4
                    // We need to extract just the date part and treat it as a local date

                    // Extract YYYY-MM-DD from the ISO string
                    const dateStr = session.scheduledDate.split("T")[0];
                    const [year, month, day] = dateStr.split("-").map(Number);

                    // Parse the time (HH:MM format)
                    const [hours, minutes] = session.scheduledTime
                      .split(":")
                      .map(Number);

                    // Create a Date object in the LOCAL timezone (not UTC)
                    // This ensures Nov 4 at 6:00 PM stays Nov 4 at 6:00 PM regardless of timezone
                    const sessionDate = new Date(
                      year,
                      month - 1,
                      day,
                      hours,
                      minutes,
                      0,
                      0
                    );

                    // Calculate end time by adding duration
                    const endDate = new Date(sessionDate);
                    endDate.setMinutes(
                      endDate.getMinutes() + (session.duration || 60)
                    );

                    console.log(
                      `Session ${session.sessionNumber}: ${dateStr} ${
                        session.scheduledTime
                      } -> ${sessionDate.toLocaleString()}`
                    );

                    return {
                      id: `class-session-${session.id}`,
                      title: `${trainingClass.name} - Session ${session.sessionNumber}`,
                      start: sessionDate,
                      end: endDate,
                      backgroundColor: "#9c27b0", // Purple for training classes
                      borderColor: "#7b1fa2",
                      textColor: "#ffffff",
                      extendedProps: {
                        type: "trainingClass",
                        trainingClass,
                        session,
                      },
                    };
                  });

                  console.log("Session events created:", sessionEvents);
                  allEvents.push(...sessionEvents);
                }
              } catch (sessionError) {
                console.error(
                  `Error loading sessions for class ${trainingClass.id}:`,
                  sessionError
                );
              }
            }
          }
        } catch (classError) {
          console.error("Error loading training classes:", classError);
        }
      }

      console.log("Total events to display:", allEvents.length, allEvents);
      setEvents(allEvents);
      return allEvents;
    } catch (error) {
      console.error("SpecializedCalendar: Error loading reservations:", error);
      setEvents([]);
      return [];
    }
  }, [serviceCategories, staffId]);

  // Load reservations when the component mounts or when serviceCategories changes
  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  /**
   * Event listener to handle reservation completion
   * This is triggered when add-ons are added to a reservation
   * It closes the form dialog and refreshes the calendar
   */
  useEffect(() => {
    const handleReservationComplete = (_event: Event) => {
      // Close the form dialog and reset all selection state
      setIsFormOpen(false);
      setSelectedEvent(null);
      setSelectedDate(null);

      // Reload reservations to refresh the calendar with the updated data
      loadReservations();
    };

    // Add the event listener for the custom event
    document.addEventListener("reservationComplete", handleReservationComplete);

    // Clean up the event listener when the component unmounts to prevent memory leaks
    return () => {
      document.removeEventListener(
        "reservationComplete",
        handleReservationComplete
      );
    };
  }, [loadReservations]);

  // Get the color for a reservation status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "CONFIRMED":
        return "#4caf50"; // Green
      case "PENDING":
        return "#ff9800"; // Orange
      case "CHECKED_IN":
        return "#2196f3"; // Blue
      case "CHECKED_OUT":
        return "#9e9e9e"; // Gray
      case "CANCELLED":
        return "#f44336"; // Red
      default:
        return "#9e9e9e"; // Gray
    }
  };

  // Handle date selection in the calendar
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const start = selectInfo.start;
    const end = selectInfo.end;

    // Set the selected date range
    setSelectedDate({ start, end });

    // Open the form dialog
    setIsFormOpen(true);
  };

  // Handle clicking on an existing event
  const handleEventClick = (clickInfo: EventClickArg) => {
    // Get the reservation from the event's extendedProps
    const reservation = clickInfo.event.extendedProps
      .reservation as Reservation;
    if (reservation) {
      // Transform the reservation data to include IDs that ReservationForm expects
      const transformedReservation = {
        ...reservation,
        // The reservation already has the correct IDs at the top level
        customerId: reservation.customerId,
        petId: reservation.petId,
        serviceId: reservation.serviceId,
      };

      setSelectedEvent(transformedReservation);
      setSelectedDate({
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate),
      });
      setIsFormOpen(true);
    } else {
    }
  };

  // Handle event drop (drag and drop)
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    try {
      const reservation = dropInfo.event.extendedProps
        .reservation as Reservation;
      if (!reservation) {
        console.error("No reservation data found in event");
        dropInfo.revert();
        return;
      }

      // Calculate the new start and end dates
      const newStart = dropInfo.event.start;
      const newEnd = dropInfo.event.end;

      if (!newStart || !newEnd) {
        console.error("Invalid dates after drop");
        dropInfo.revert();
        return;
      }

      // Update the reservation with new dates
      await reservationService.updateReservation(reservation.id, {
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString(),
      });

      // Reload reservations to ensure we have the latest data
      await loadReservations();

      console.log("Reservation updated successfully after drag");
    } catch (error) {
      console.error("Error updating reservation after drag:", error);
      // Revert the event to its original position if the update failed
      dropInfo.revert();
    }
  };

  // Handle event resize
  const handleEventResize = async (resizeInfo: any) => {
    try {
      const reservation = resizeInfo.event.extendedProps
        .reservation as Reservation;
      if (!reservation) {
        console.error("No reservation data found in event");
        resizeInfo.revert();
        return;
      }

      // Calculate the new start and end dates
      const newStart = resizeInfo.event.start;
      const newEnd = resizeInfo.event.end;

      if (!newStart || !newEnd) {
        console.error("Invalid dates after resize");
        resizeInfo.revert();
        return;
      }

      // Update the reservation with new dates
      await reservationService.updateReservation(reservation.id, {
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString(),
      });

      // Reload reservations to ensure we have the latest data
      await loadReservations();

      console.log("Reservation updated successfully after resize");
    } catch (error) {
      console.error("Error updating reservation after resize:", error);
      // Revert the event to its original size if the update failed
      resizeInfo.revert();
    }
  };

  // Handle form submission for creating or updating a reservation
  const handleFormSubmit = async (formData: any) => {
    try {
      let updatedReservation;

      if (selectedEvent) {
        updatedReservation = await reservationService.updateReservation(
          selectedEvent.id,
          formData
        );
      } else {
        const response = await reservationService.createReservation(formData);

        // Store the response in the updatedReservation variable
        updatedReservation = response;

        // Check if we need to navigate the response object to get to the actual reservation data
        // This is done to handle different API response formats
        if (typeof response === "object" && response !== null) {
          // If the response has a data property and a success status, use the data property
          if (
            "data" in response &&
            "status" in response &&
            (response.status as string) === "success"
          ) {
            updatedReservation = response.data as any; // Use 'any' to avoid TypeScript errors
          }
        }
      }

      if (updatedReservation) {
        // Load reservations and get the updated events immediately
        const updatedEvents = await loadReservations();

        // Force a refresh of the calendar by creating a new reference
        setEvents([...updatedEvents]);

        if (
          onEventUpdate &&
          typeof updatedReservation === "object" &&
          updatedReservation !== null
        ) {
          // Cast to Reservation type before passing to onEventUpdate
          onEventUpdate(updatedReservation as Reservation);
        }

        // Extract the reservation ID (handling different response formats)
        let reservationId = "";
        if (
          typeof updatedReservation === "object" &&
          updatedReservation !== null
        ) {
          if ("id" in updatedReservation) {
            reservationId = updatedReservation.id as string;
          } else if ("_id" in updatedReservation) {
            reservationId = updatedReservation._id as string;
          }
        }

        // For existing reservations, close the form immediately
        if (selectedEvent) {
          // Close the form for updates
          setIsFormOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        } else {
          // For new reservations, keep the form open for add-ons
          // The ReservationForm component will handle closing the dialog after add-ons are processed
        }

        // Return the reservation ID so it can be used for add-ons
        return { reservationId };
      } else {
        console.warn(
          "SpecializedCalendar: No reservation returned from server"
        );
        // Do NOT close the dialog if reservation failed
      }
    } catch (error) {
      console.error("SpecializedCalendar: Error saving reservation:", error);
      // Do NOT close the dialog on error; let the form show the error
      throw error; // Re-throw the error so the ReservationForm can handle it
    }
  };

  return (
    <Box sx={{ height: "calc(100vh - 200px)", p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h2">
          {calendarTitle || "Specialized Calendar"} ({events.length}{" "}
          reservations)
        </Typography>
      </Box>
      <Paper elevation={3} sx={{ height: "calc(100% - 60px)", p: 2 }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          initialView="timeGridWeek"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="100%"
          slotMinTime="06:00:00"
          slotMaxTime="20:00:00"
          eventColor="#4c8bf5"
          eventTextColor="#ffffff"
          timeZone="local"
          locale="en-US"
          // Fixed time format settings using object notation instead of strings
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }}
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
          }}
          initialDate={new Date()}
          firstDay={new Date().getDay()} // Start week from current day
          views={{
            timeGrid: {
              nowIndicator: true,
            },
            timeGridDay: {},
            timeGridWeek: {},
          }}
          dayHeaderFormat={{
            weekday: "short",
            month: "numeric",
            day: "numeric",
            omitCommas: true,
          }}
        />
      </Paper>

      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { maxHeight: "80vh" },
        }}
      >
        <DialogTitle sx={{ py: 1, px: 2, fontSize: "1rem" }}>
          {selectedEvent ? "Edit Reservation" : "Create New Reservation"}
        </DialogTitle>
        <DialogContent sx={{ py: 1, px: 2 }}>
          {selectedEvent || selectedDate ? (
            <>
              <ReservationForm
                onSubmit={handleFormSubmit}
                initialData={selectedEvent || undefined}
                defaultDates={selectedDate || undefined}
                showAddOns={true}
                serviceCategories={serviceCategories}
              />
            </>
          ) : (
            <div>Loading reservation form...</div>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SpecializedCalendar;
