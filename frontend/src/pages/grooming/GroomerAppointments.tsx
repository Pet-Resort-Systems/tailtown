import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Autocomplete,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  SwapHoriz as ReassignIcon,
} from "@mui/icons-material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { format } from "date-fns";
import schedulingService from "../../services/schedulingService";
import { petService } from "../../services/petService";
import { customerService } from "../../services/customerService";
import {
  GroomerAppointment,
  CreateGroomerAppointmentRequest,
} from "../../types/scheduling";

const GroomerAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<GroomerAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<GroomerAppointment | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateGroomerAppointmentRequest>({
    groomerId: "",
    serviceId: "",
    petId: "",
    customerId: "",
    scheduledDate: new Date(),
    scheduledTime: "09:00",
    duration: 60,
    notes: "",
  });

  // Filter state
  const [filters, setFilters] = useState({
    groomerId: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadAppointments();
  }, [filters]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await schedulingService.groomerAppointments.getAll(filters);
      setAppointments(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load appointments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (appointment?: GroomerAppointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        groomerId: appointment.groomerId,
        serviceId: appointment.serviceId,
        petId: appointment.petId,
        customerId: appointment.customerId,
        scheduledDate: new Date(appointment.scheduledDate),
        scheduledTime: appointment.scheduledTime,
        duration: appointment.duration,
        notes: appointment.notes || "",
      });
    } else {
      setEditingAppointment(null);
      setFormData({
        groomerId: "",
        serviceId: "",
        petId: "",
        customerId: "",
        scheduledDate: new Date(),
        scheduledTime: "09:00",
        duration: 60,
        notes: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAppointment(null);
  };

  const handleSave = async () => {
    try {
      if (editingAppointment) {
        await schedulingService.groomerAppointments.update(
          editingAppointment.id,
          {
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
            duration: formData.duration,
            notes: formData.notes,
          }
        );
      } else {
        await schedulingService.groomerAppointments.create(formData);
      }
      await loadAppointments();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || "Failed to save appointment");
    }
  };

  const handleStart = async (id: string) => {
    try {
      await schedulingService.groomerAppointments.start(id);
      await loadAppointments();
    } catch (err: any) {
      setError(err.message || "Failed to start appointment");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await schedulingService.groomerAppointments.complete(id);
      await loadAppointments();
    } catch (err: any) {
      setError(err.message || "Failed to complete appointment");
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await schedulingService.groomerAppointments.cancel(id);
        await loadAppointments();
      } catch (err: any) {
        setError(err.message || "Failed to cancel appointment");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await schedulingService.groomerAppointments.delete(id);
        await loadAppointments();
      } catch (err: any) {
        setError(err.message || "Failed to delete appointment");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "primary";
      case "IN_PROGRESS":
        return "warning";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ");
  };

  if (loading && appointments.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">Groomer Appointments</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Appointment
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={() =>
                setFilters({
                  groomerId: "",
                  status: "",
                  startDate: "",
                  endDate: "",
                })
              }
              fullWidth
              sx={{ height: "56px" }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Pet</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Groomer</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="textSecondary" py={4}>
                      No appointments found. Click "New Appointment" to create
                      one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {format(
                          new Date(appointment.scheduledDate),
                          "MMM dd, yyyy"
                        )}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {appointment.scheduledTime}
                      </Typography>
                    </TableCell>
                    <TableCell>{appointment.pet?.name || "Unknown"}</TableCell>
                    <TableCell>
                      {appointment.customer
                        ? `${appointment.customer.firstName} ${appointment.customer.lastName}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {appointment.groomer
                        ? `${appointment.groomer.firstName} ${appointment.groomer.lastName}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {appointment.service?.name || "Unknown"}
                    </TableCell>
                    <TableCell>{appointment.duration} min</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(appointment.status)}
                        color={getStatusColor(appointment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {appointment.status === "SCHEDULED" && (
                        <>
                          <Tooltip title="Start">
                            <IconButton
                              size="small"
                              onClick={() => handleStart(appointment.id)}
                              color="primary"
                            >
                              <StartIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(appointment)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {appointment.status === "IN_PROGRESS" && (
                        <Tooltip title="Complete">
                          <IconButton
                            size="small"
                            onClick={() => handleComplete(appointment.id)}
                            color="success"
                          >
                            <CompleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(appointment.status === "SCHEDULED" ||
                        appointment.status === "IN_PROGRESS") && (
                        <Tooltip title="Cancel">
                          <IconButton
                            size="small"
                            onClick={() => handleCancel(appointment.id)}
                            color="error"
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(appointment.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAppointment ? "Edit Appointment" : "New Appointment"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={
                  formData.scheduledDate instanceof Date
                    ? formData.scheduledDate
                    : new Date(formData.scheduledDate)
                }
                onChange={(date) =>
                  setFormData({
                    ...formData,
                    scheduledDate: date || new Date(),
                  })
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>

            <TextField
              label="Time"
              type="time"
              value={formData.scheduledTime}
              onChange={(e) =>
                setFormData({ ...formData, scheduledTime: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Duration (minutes)"
              type="number"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: parseInt(e.target.value) })
              }
              fullWidth
            />

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              multiline
              rows={3}
              fullWidth
            />

            {!editingAppointment && (
              <Alert severity="info">
                Note: For new appointments, you'll need to select groomer,
                service, pet, and customer. This simplified form allows editing
                existing appointments only.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editingAppointment ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroomerAppointments;
