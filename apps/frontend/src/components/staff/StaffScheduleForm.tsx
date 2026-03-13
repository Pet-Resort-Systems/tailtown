import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { format, parse } from "date-fns";
import {
  StaffSchedule,
  ScheduleStatus,
  Staff,
} from "../../services/staffService";

interface StaffScheduleFormProps {
  open: boolean;
  onClose: () => void;
  staffId?: string;
  schedule?: StaffSchedule;
  onSave: (schedule: StaffSchedule) => void;
  isEditing: boolean;
  allStaff?: Staff[];
  initialDate?: Date;
  existingSchedules?: StaffSchedule[];
}

const StaffScheduleForm: React.FC<StaffScheduleFormProps> = ({
  open,
  onClose,
  staffId,
  schedule,
  onSave,
  isEditing,
  allStaff,
  initialDate,
  existingSchedules = [],
}) => {
  const [formData, setFormData] = useState<Partial<StaffSchedule>>({
    id: schedule?.id || undefined, // Keep the ID for updates to prevent duplicates
    staffId: staffId || "",
    date: initialDate
      ? format(initialDate, "yyyy-MM-dd")
      : new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    status: ScheduleStatus.SCHEDULED,
    notes: "",
    location: "",
    startingLocation: "", // Add starting location field
    role: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (schedule) {
      setFormData({
        ...schedule,
        startingLocation: schedule.startingLocation || "", // Initialize starting location
        date: schedule.date
          ? schedule.date.toString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    } else if (staffId) {
      setFormData((prev) => ({ ...prev, staffId }));
    }
  }, [schedule, staffId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error when field is updated
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error when field is updated
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
  };

  const handleDateChange = (value: unknown) => {
    const date = value as Date | null;
    if (date) {
      // Format date in local timezone to avoid timezone shift
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const localDateString = `${year}-${month}-${day}`;

      setFormData((prev) => ({ ...prev, date: localDateString }));
      if (errors.date) {
        setErrors((prev) => ({ ...prev, date: "" }));
      }
    }
  };

  const handleTimeChange = (field: string, time: Date | null) => {
    if (time) {
      setFormData((prev) => ({ ...prev, [field]: format(time, "HH:mm") }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.staffId) {
      newErrors.staffId = "Staff member is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }

    if (formData.startTime && formData.endTime) {
      const start = parseTimeString(formData.startTime);
      const end = parseTimeString(formData.endTime);
      if (start >= end) {
        newErrors.endTime = "End time must be after start time";
      }
    }

    // Check for overlapping schedules
    if (
      formData.staffId &&
      formData.date &&
      formData.startTime &&
      formData.endTime
    ) {
      const hasOverlap = existingSchedules.some((existingSchedule) => {
        // Skip if it's the same schedule we're editing
        if (isEditing && existingSchedule.id === formData.id) {
          return false;
        }

        // Check if same staff member
        if (existingSchedule.staffId !== formData.staffId) {
          return false;
        }

        // Compare dates - handle both ISO format and simple date string
        let existingDateStr: string;
        if (
          typeof existingSchedule.date === "string" &&
          existingSchedule.date.includes("T")
        ) {
          // ISO format: extract date part before 'T'
          existingDateStr = existingSchedule.date.split("T")[0];
        } else {
          existingDateStr = String(existingSchedule.date);
        }

        // Check if same date
        if (existingDateStr !== formData.date) {
          return false;
        }

        // Parse times for comparison
        const newStart = parseTimeString(formData.startTime!);
        const newEnd = parseTimeString(formData.endTime!);
        const existingStart = parseTimeString(existingSchedule.startTime);
        const existingEnd = parseTimeString(existingSchedule.endTime);

        // Check for time overlap
        // Overlap occurs if: (newStart < existingEnd) AND (newEnd > existingStart)
        return newStart < existingEnd && newEnd > existingStart;
      });

      if (hasOverlap) {
        newErrors.startTime =
          "This staff member already has a schedule during this time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseTimeString = (timeString: string): Date => {
    return parse(timeString, "HH:mm", new Date());
  };

  const handleSubmit = async () => {
    if (!validateForm() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      onSave(formData as StaffSchedule);
    } finally {
      // Reset after a short delay to prevent immediate re-submission
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? "Edit Schedule" : "Add New Schedule"}
      </DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {allStaff && (
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.staffId}>
                  <InputLabel>Staff Member</InputLabel>
                  <Select
                    name="staffId"
                    value={formData.staffId || ""}
                    onChange={handleSelectChange}
                    label="Staff Member"
                  >
                    {allStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.staffId && (
                    <FormHelperText>{errors.staffId}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date"
                value={formData.date ? new Date(formData.date) : null}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.date,
                    helperText: errors.date,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TimePicker
                label="Start Time"
                value={
                  formData.startTime
                    ? parseTimeString(formData.startTime)
                    : null
                }
                onChange={(time) => handleTimeChange("startTime", time)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startTime,
                    helperText: errors.startTime,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TimePicker
                label="End Time"
                value={
                  formData.endTime ? parseTimeString(formData.endTime) : null
                }
                onChange={(time) => handleTimeChange("endTime", time)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.endTime,
                    helperText: errors.endTime,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status || ScheduleStatus.SCHEDULED}
                  onChange={handleSelectChange}
                  label="Status"
                >
                  {Object.values(ScheduleStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.replace("_", " ")}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location || ""}
                onChange={handleInputChange}
                placeholder="Department or work area"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Starting Location"
                name="startingLocation"
                value={formData.startingLocation || ""}
                onChange={handleInputChange}
                placeholder="Initial assignment location"
                helperText="Where staff should report at the beginning of shift"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Role"
                name="role"
                value={formData.role || ""}
                onChange={handleInputChange}
                placeholder="Specific role for this shift"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes || ""}
                onChange={handleInputChange}
                multiline
                rows={3}
                placeholder="Any additional information about this schedule"
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaffScheduleForm;
