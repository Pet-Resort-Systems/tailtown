import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { reservationService } from "../../services/reservationService";
import { Reservation } from "../../services/reservationService";
import { serviceManagement } from "../../services/serviceManagement";
import { resourceService, type Resource } from "../../services/resourceService";
import { Service } from "../../types/service";
import { sortByRoomAndNumber } from "../../utils/sortingUtils";

export default function ReservationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [occupiedResourceIds, setOccupiedResourceIds] = useState<Set<string>>(
    new Set()
  );
  type ReservationStatus =
    | "PENDING"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "CANCELLED"
    | "COMPLETED"
    | "NO_SHOW";

  const [formData, setFormData] = useState({
    startDate: new Date(),
    endDate: new Date(),
    status: "CONFIRMED" as ReservationStatus,
    serviceId: "",
    resourceId: "",
    notes: "",
    staffNotes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      if (!id) return;

      // Load reservation, services, and resources in parallel
      const [reservationData, servicesResponse, resourcesResponse] =
        await Promise.all([
          reservationService.getReservationById(id),
          serviceManagement.getAllServices(),
          resourceService.getAllResources(),
        ]);

      setReservation(reservationData);
      setServices(servicesResponse.data || []);
      setResources(sortByRoomAndNumber(resourcesResponse.data || []));

      setFormData({
        startDate: new Date(reservationData.startDate),
        endDate: new Date(reservationData.endDate),
        status: reservationData.status,
        serviceId: reservationData.service?.id || "",
        resourceId: reservationData.resource?.id || "",
        notes: reservationData.notes || "",
        staffNotes: reservationData.staffNotes || "",
      });
      setError(null);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load reservation details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check availability when dates change
  const checkAvailability = useCallback(async () => {
    if (!formData.startDate || !formData.endDate || resources.length === 0) {
      setOccupiedResourceIds(new Set());
      return;
    }

    try {
      const resourceIds = resources.map((r) => r.id);

      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const response = await resourceService.batchCheckResourceAvailability(
        resourceIds,
        formatDate(formData.startDate),
        formatDate(formData.endDate)
      );

      if (response?.status === "success" && response?.data?.resources) {
        const occupied = new Set<string>();
        response.data.resources.forEach((result: any) => {
          if (!result.isAvailable) {
            // Check if this conflict is with the current reservation being edited
            const isCurrentReservation =
              id &&
              result.conflictingReservations?.some((r: any) => r.id === id);

            // Only mark as occupied if it's NOT the current reservation
            if (!isCurrentReservation) {
              occupied.add(result.resourceId);
            }
          }
        });
        setOccupiedResourceIds(occupied);
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      setOccupiedResourceIds(new Set());
    }
  }, [formData.startDate, formData.endDate, resources, id]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!id) return;
      const updatedReservation = await reservationService.updateReservation(
        id,
        {
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
          status: formData.status,
          notes: formData.notes,
          staffNotes: formData.staffNotes,
          // Add the fields that the backend expects
          ...(formData.serviceId && { serviceId: formData.serviceId }),
          ...(formData.resourceId && { resourceId: formData.resourceId }),
        } as any
      );
      navigate(`/reservations/${id}`);
    } catch (error) {
      console.error("Error updating reservation:", error);
      setError("Failed to update reservation");
    }
  };

  const handleCancel = () => {
    navigate(`/reservations/${id}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !reservation) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error || "Reservation not found"}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Edit Reservation
        </Typography>
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Service: {reservation.service?.name || "N/A"}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Customer: {reservation.customer?.firstName}{" "}
                {reservation.customer?.lastName}
              </Typography>

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box sx={{ mb: 3 }}>
                  <DateTimePicker
                    label="Start Date"
                    value={formData.startDate}
                    onChange={(date) =>
                      date && setFormData({ ...formData, startDate: date })
                    }
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <DateTimePicker
                    label="End Date"
                    value={formData.endDate}
                    onChange={(date) =>
                      date && setFormData({ ...formData, endDate: date })
                    }
                  />
                </Box>
              </LocalizationProvider>
            </Box>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as ReservationStatus,
                  })
                }
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                <MenuItem value="CHECKED_OUT">Checked Out</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
                <MenuItem value="NO_SHOW">No Show</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Service</InputLabel>
              <Select
                value={formData.serviceId}
                label="Service"
                onChange={(e) =>
                  setFormData({ ...formData, serviceId: e.target.value })
                }
              >
                <MenuItem value="">
                  <em>Select a service</em>
                </MenuItem>
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Kennel/Suite</InputLabel>
              <Select
                value={formData.resourceId}
                label="Kennel/Suite"
                onChange={(e) =>
                  setFormData({ ...formData, resourceId: e.target.value })
                }
              >
                <MenuItem value="">
                  <em>Select a kennel/suite</em>
                </MenuItem>
                {resources.map((resource) => {
                  const isOccupied = occupiedResourceIds.has(resource.id);
                  return (
                    <MenuItem
                      key={resource.id}
                      value={resource.id}
                      disabled={isOccupied}
                      sx={{
                        color: isOccupied ? "#d32f2f" : "#2e7d32",
                        opacity: isOccupied ? 0.6 : 1,
                      }}
                    >
                      {isOccupied ? "🔴 " : "🟢 "}
                      {resource.name} ({resource.type})
                      {isOccupied && " (Occupied)"}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Customer Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Staff Notes"
              multiline
              rows={3}
              value={formData.staffNotes}
              onChange={(e) =>
                setFormData({ ...formData, staffNotes: e.target.value })
              }
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                Save Changes
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
