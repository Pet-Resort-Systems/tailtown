/**
 * Operating Hours Step
 *
 * Configure business hours, check-in/out windows, and holidays.
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { ArrowForward, ArrowBack, Add } from "@mui/icons-material";
import { useSetupWizard } from "../SetupWizardContext";
import { DayHours, HolidayConfig } from "../types";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default function OperatingHoursStep() {
  const { state, setOperatingHours, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { operatingHours } = state;

  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Partial<HolidayConfig>>({
    name: "",
    date: "",
    closed: false,
    surchargeApplies: true,
  });

  const updateDayHours = (
    day: (typeof DAYS)[number],
    field: keyof DayHours,
    value: string | boolean
  ) => {
    setOperatingHours({
      hours: {
        ...operatingHours.hours,
        [day]: { ...operatingHours.hours[day], [field]: value },
      },
    });
  };

  const addHoliday = () => {
    if (newHoliday.name && newHoliday.date) {
      setOperatingHours({
        holidays: [...operatingHours.holidays, newHoliday as HolidayConfig],
      });
      setHolidayDialogOpen(false);
      setNewHoliday({
        name: "",
        date: "",
        closed: false,
        surchargeApplies: true,
      });
    }
  };

  const removeHoliday = (index: number) => {
    setOperatingHours({
      holidays: operatingHours.holidays.filter((_, i) => i !== index),
    });
  };

  const handleNext = () => {
    completeStep("operating-hours");
    nextStep();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Operating Hours
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Set your business hours and holiday schedule.
      </Typography>

      {/* Daily Hours */}
      <Typography variant="h6" gutterBottom>
        Business Hours
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {DAYS.map((day) => (
          <Grid item xs={12} sm={6} md={4} key={day}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2">{DAY_LABELS[day]}</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={!operatingHours.hours[day].closed}
                        onChange={(e) =>
                          updateDayHours(day, "closed", !e.target.checked)
                        }
                      />
                    }
                    label={operatingHours.hours[day].closed ? "Closed" : "Open"}
                    labelPlacement="start"
                  />
                </Box>
                {!operatingHours.hours[day].closed && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      size="small"
                      type="time"
                      label="Open"
                      value={operatingHours.hours[day].open}
                      onChange={(e) =>
                        updateDayHours(day, "open", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      type="time"
                      label="Close"
                      value={operatingHours.hours[day].close}
                      onChange={(e) =>
                        updateDayHours(day, "close", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Check-in/Check-out Windows */}
      <Typography variant="h6" gutterBottom>
        Check-in & Check-out Windows
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Check-in Window
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  size="small"
                  type="time"
                  label="From"
                  value={operatingHours.checkInWindow.start}
                  onChange={(e) =>
                    setOperatingHours({
                      checkInWindow: {
                        ...operatingHours.checkInWindow,
                        start: e.target.value,
                      },
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="time"
                  label="To"
                  value={operatingHours.checkInWindow.end}
                  onChange={(e) =>
                    setOperatingHours({
                      checkInWindow: {
                        ...operatingHours.checkInWindow,
                        end: e.target.value,
                      },
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Check-out Window
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  size="small"
                  type="time"
                  label="From"
                  value={operatingHours.checkOutWindow.start}
                  onChange={(e) =>
                    setOperatingHours({
                      checkOutWindow: {
                        ...operatingHours.checkOutWindow,
                        start: e.target.value,
                      },
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="time"
                  label="To"
                  value={operatingHours.checkOutWindow.end}
                  onChange={(e) =>
                    setOperatingHours({
                      checkOutWindow: {
                        ...operatingHours.checkOutWindow,
                        end: e.target.value,
                      },
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Holidays */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Holidays</Typography>
        <Button startIcon={<Add />} onClick={() => setHolidayDialogOpen(true)}>
          Add Holiday
        </Button>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4 }}>
        {operatingHours.holidays.map((holiday, index) => (
          <Chip
            key={index}
            label={`${holiday.name} (${holiday.date})`}
            color={
              holiday.closed
                ? "error"
                : holiday.surchargeApplies
                ? "warning"
                : "default"
            }
            onDelete={() => removeHoliday(index)}
            variant="outlined"
          />
        ))}
        {operatingHours.holidays.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No holidays configured
          </Typography>
        )}
      </Box>

      {/* Holiday Dialog */}
      <Dialog
        open={holidayDialogOpen}
        onClose={() => setHolidayDialogOpen(false)}
      >
        <DialogTitle>Add Holiday</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Holiday Name"
                value={newHoliday.name}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date (MM-DD for recurring)"
                value={newHoliday.date}
                onChange={(e) =>
                  setNewHoliday({ ...newHoliday, date: e.target.value })
                }
                placeholder="12-25"
                helperText="Use MM-DD format for annual holidays"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newHoliday.closed}
                    onChange={(e) =>
                      setNewHoliday({ ...newHoliday, closed: e.target.checked })
                    }
                  />
                }
                label="Closed on this day"
              />
            </Grid>
            {!newHoliday.closed && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newHoliday.surchargeApplies}
                      onChange={(e) =>
                        setNewHoliday({
                          ...newHoliday,
                          surchargeApplies: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Apply holiday surcharge"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHolidayDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={addHoliday}
            disabled={!newHoliday.name || !newHoliday.date}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleNext}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
