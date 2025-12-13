/**
 * Standing Reservations Component
 * Displays and manages recurring reservation templates for a customer
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Repeat as RepeatIcon,
  PlayArrow as GenerateIcon,
  Pause as PauseIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import standingReservationService, {
  StandingReservation,
  CreateStandingReservationData,
  RecurrenceFrequency,
} from "../../services/standingReservationService";
import { serviceManagement } from "../../services/serviceManagement";
import { petService } from "../../services/petService";

interface StandingReservationsProps {
  customerId: string;
  customerName: string;
}

interface Pet {
  id: string;
  name: string;
  type: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  serviceCategory: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const StandingReservations: React.FC<StandingReservationsProps> = ({
  customerId,
  customerName,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [standingReservations, setStandingReservations] = useState<
    StandingReservation[]
  >([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<StandingReservation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] =
    useState<StandingReservation | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    petId: string;
    serviceId: string;
    name: string;
    frequency: RecurrenceFrequency;
    daysOfWeek: number[];
    dayOfMonth: number;
    startTime: string;
    endTime: string;
    effectiveFrom: Date | null;
    effectiveUntil: Date | null;
    notes: string;
    autoConfirm: boolean;
  }>({
    petId: "",
    serviceId: "",
    name: "",
    frequency: "WEEKLY",
    daysOfWeek: [],
    dayOfMonth: 1,
    startTime: "09:00",
    endTime: "17:00",
    effectiveFrom: new Date(),
    effectiveUntil: null,
    notes: "",
    autoConfirm: false,
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [reservationsData, petsData, servicesResponse] =
          await Promise.all([
            standingReservationService.getByCustomer(customerId),
            petService
              .getPetsByCustomer(customerId)
              .then((res: any) => res.data || []),
            serviceManagement.getAllServices(),
          ]);

        setStandingReservations(reservationsData);
        setPets(petsData || []);
        setServices(servicesResponse?.data || []);
      } catch (err: any) {
        console.error("Error loading standing reservations:", err);
        setError("Failed to load standing reservations");
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      loadData();
    }
  }, [customerId]);

  const handleOpenDialog = (reservation?: StandingReservation) => {
    if (reservation) {
      setEditingReservation(reservation);
      setFormData({
        petId: reservation.petId,
        serviceId: reservation.serviceId,
        name: reservation.name,
        frequency: reservation.frequency,
        daysOfWeek: reservation.daysOfWeek || [],
        dayOfMonth: reservation.dayOfMonth || 1,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        effectiveFrom: new Date(reservation.effectiveFrom),
        effectiveUntil: reservation.effectiveUntil
          ? new Date(reservation.effectiveUntil)
          : null,
        notes: reservation.notes || "",
        autoConfirm: reservation.autoConfirm,
      });
    } else {
      setEditingReservation(null);
      setFormData({
        petId: pets.length > 0 ? pets[0].id : "",
        serviceId: "",
        name: "",
        frequency: "WEEKLY",
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri default
        dayOfMonth: 1,
        startTime: "09:00",
        endTime: "17:00",
        effectiveFrom: new Date(),
        effectiveUntil: null,
        notes: "",
        autoConfirm: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReservation(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.petId || !formData.serviceId || !formData.name) {
        setError("Please fill in all required fields");
        return;
      }

      if (
        (formData.frequency === "WEEKLY" ||
          formData.frequency === "BIWEEKLY") &&
        formData.daysOfWeek.length === 0
      ) {
        setError("Please select at least one day of the week");
        return;
      }

      const data: CreateStandingReservationData = {
        customerId,
        petId: formData.petId,
        serviceId: formData.serviceId,
        name: formData.name,
        frequency: formData.frequency,
        daysOfWeek:
          formData.frequency === "WEEKLY" || formData.frequency === "BIWEEKLY"
            ? formData.daysOfWeek
            : undefined,
        dayOfMonth:
          formData.frequency === "MONTHLY" ? formData.dayOfMonth : undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        effectiveFrom:
          formData.effectiveFrom?.toISOString() || new Date().toISOString(),
        effectiveUntil: formData.effectiveUntil?.toISOString(),
        notes: formData.notes || undefined,
        autoConfirm: formData.autoConfirm,
      };

      if (editingReservation) {
        await standingReservationService.update(editingReservation.id, data);
        setSuccess("Standing reservation updated successfully");
      } else {
        await standingReservationService.create(data);
        setSuccess("Standing reservation created successfully");
      }

      // Reload
      const updated = await standingReservationService.getByCustomer(
        customerId
      );
      setStandingReservations(updated);
      handleCloseDialog();
    } catch (err: any) {
      console.error("Error saving standing reservation:", err);
      setError(
        err.response?.data?.message || "Failed to save standing reservation"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reservationToDelete) return;

    try {
      setSaving(true);
      await standingReservationService.delete(reservationToDelete.id);
      setSuccess("Standing reservation deleted");

      const updated = await standingReservationService.getByCustomer(
        customerId
      );
      setStandingReservations(updated);
      setDeleteConfirmOpen(false);
      setReservationToDelete(null);
    } catch (err: any) {
      console.error("Error deleting standing reservation:", err);
      setError("Failed to delete standing reservation");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (reservation: StandingReservation) => {
    try {
      await standingReservationService.update(reservation.id, {
        isActive: !reservation.isActive,
      });
      const updated = await standingReservationService.getByCustomer(
        customerId
      );
      setStandingReservations(updated);
      setSuccess(
        `Standing reservation ${reservation.isActive ? "paused" : "activated"}`
      );
    } catch (err: any) {
      console.error("Error toggling standing reservation:", err);
      setError("Failed to update standing reservation");
    }
  };

  const handleGenerate = async (reservation: StandingReservation) => {
    try {
      const result = await standingReservationService.generateReservations(
        reservation.id
      );
      setSuccess(`Generated ${result.generatedCount} reservation instances`);
    } catch (err: any) {
      console.error("Error generating reservations:", err);
      setError("Failed to generate reservations");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RepeatIcon color="primary" />
            <Typography variant="h6">Standing Reservations</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={pets.length === 0}
          >
            Add Standing Reservation
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        {pets.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              This customer has no pets. Add a pet first to create standing
              reservations.
            </Typography>
          </Paper>
        ) : standingReservations.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No standing reservations for {customerName}.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ mt: 2 }}
            >
              Create First Standing Reservation
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Pet</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standingReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>{reservation.name}</TableCell>
                    <TableCell>{reservation.pet?.name}</TableCell>
                    <TableCell>{reservation.service?.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {standingReservationService.formatFrequency(
                          reservation.frequency,
                          reservation.daysOfWeek,
                          reservation.dayOfMonth
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {reservation.startTime} - {reservation.endTime}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={reservation.isActive ? "Active" : "Paused"}
                        color={reservation.isActive ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Generate upcoming reservations">
                        <IconButton
                          size="small"
                          onClick={() => handleGenerate(reservation)}
                          disabled={!reservation.isActive}
                        >
                          <GenerateIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={reservation.isActive ? "Pause" : "Activate"}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(reservation)}
                        >
                          {reservation.isActive ? (
                            <PauseIcon />
                          ) : (
                            <GenerateIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(reservation)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setReservationToDelete(reservation);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingReservation
              ? "Edit Standing Reservation"
              : "Create Standing Reservation"}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Weekly Daycare - Buddy"
                fullWidth
                required
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Pet</InputLabel>
                    <Select
                      value={formData.petId}
                      onChange={(e) =>
                        setFormData({ ...formData, petId: e.target.value })
                      }
                      label="Pet"
                    >
                      {pets.map((pet) => (
                        <MenuItem key={pet.id} value={pet.id}>
                          {pet.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Service</InputLabel>
                    <Select
                      value={formData.serviceId}
                      onChange={(e) =>
                        setFormData({ ...formData, serviceId: e.target.value })
                      }
                      label="Service"
                    >
                      {services.map((service) => (
                        <MenuItem key={service.id} value={service.id}>
                          {service.name} - ${service.price}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      frequency: e.target.value as RecurrenceFrequency,
                    })
                  }
                  label="Frequency"
                >
                  <MenuItem value="DAILY">Daily</MenuItem>
                  <MenuItem value="WEEKLY">Weekly</MenuItem>
                  <MenuItem value="BIWEEKLY">Every 2 Weeks</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                </Select>
              </FormControl>

              {(formData.frequency === "WEEKLY" ||
                formData.frequency === "BIWEEKLY") && (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Days of Week
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.daysOfWeek}
                    onChange={(_, newDays) =>
                      setFormData({ ...formData, daysOfWeek: newDays || [] })
                    }
                    aria-label="days of week"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <ToggleButton
                        key={day.value}
                        value={day.value}
                        size="small"
                      >
                        {day.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}

              {formData.frequency === "MONTHLY" && (
                <TextField
                  label="Day of Month"
                  type="number"
                  value={formData.dayOfMonth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dayOfMonth: parseInt(e.target.value) || 1,
                    })
                  }
                  inputProps={{ min: 1, max: 31 }}
                  fullWidth
                />
              )}

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Effective From"
                    value={formData.effectiveFrom}
                    onChange={(date) =>
                      setFormData({ ...formData, effectiveFrom: date })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="Effective Until (optional)"
                    value={formData.effectiveUntil}
                    onChange={(date) =>
                      setFormData({ ...formData, effectiveUntil: date })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                multiline
                rows={2}
                fullWidth
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoConfirm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoConfirm: e.target.checked,
                      })
                    }
                  />
                }
                label="Auto-confirm generated reservations"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>Delete Standing Reservation</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{reservationToDelete?.name}"?
              This will not delete any already-generated reservations.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default StandingReservations;
