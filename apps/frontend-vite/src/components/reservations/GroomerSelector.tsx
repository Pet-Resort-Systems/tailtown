/**
 * Groomer Selector Component
 *
 * Allows selection of a groomer for grooming appointments with availability checking
 */

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { format, isWithinInterval, parseISO } from 'date-fns';
import staffService, { Staff } from '../../services/staffService';

interface GroomerSelectorProps {
  selectedGroomerId: string;
  onGroomerChange: (groomerId: string) => void;
  appointmentDate: Date | null;
  appointmentStartTime?: Date | null;
  appointmentEndTime?: Date | null;
  disabled?: boolean;
  required?: boolean;
}

interface GroomerAvailabilityStatus {
  available: boolean;
  reason?: string;
  status: 'available' | 'busy' | 'off' | 'unknown';
}

const GroomerSelector: React.FC<GroomerSelectorProps> = ({
  selectedGroomerId,
  onGroomerChange,
  appointmentDate,
  appointmentStartTime,
  appointmentEndTime,
  disabled = false,
  required = false,
}) => {
  const [groomers, setGroomers] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [groomerAvailability, setGroomerAvailability] = useState<
    Record<string, GroomerAvailabilityStatus>
  >({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Load groomers on mount
  useEffect(() => {
    const loadGroomers = async () => {
      try {
        setLoading(true);
        setError('');

        const allStaff = await staffService.getAllStaff();

        // Filter for active groomers (staff with GROOMING specialty)
        const groomingStaff = allStaff.filter(
          (staff) =>
            staff.isActive &&
            staff.specialties &&
            staff.specialties.includes('GROOMING')
        );

        // Sort by last name, then first name
        groomingStaff.sort((a, b) => {
          const lastNameCompare = a.lastName.localeCompare(b.lastName);
          if (lastNameCompare !== 0) return lastNameCompare;
          return a.firstName.localeCompare(b.firstName);
        });

        setGroomers(groomingStaff);
      } catch (err) {
        console.error('Error loading groomers:', err);
        setError('Failed to load groomers');
      } finally {
        setLoading(false);
      }
    };

    loadGroomers();
  }, []);

  // Check availability when date or time changes
  useEffect(() => {
    if (!appointmentDate || groomers.length === 0) {
      return;
    }

    const checkAllGroomersAvailability = async () => {
      setCheckingAvailability(true);
      const availabilityMap: Record<string, GroomerAvailabilityStatus> = {};

      for (const groomer of groomers) {
        const status = await checkGroomerAvailability(
          groomer.id!,
          appointmentDate,
          appointmentStartTime,
          appointmentEndTime
        );
        availabilityMap[groomer.id!] = status;
      }

      setGroomerAvailability(availabilityMap);
      setCheckingAvailability(false);
    };

    checkAllGroomersAvailability();
  }, [appointmentDate, appointmentStartTime, appointmentEndTime, groomers]);

  /**
   * Check if a groomer is available for the selected date/time
   * Uses staff schedules (shifts) to determine availability
   */
  const checkGroomerAvailability = async (
    groomerId: string,
    date: Date,
    startTime?: Date | null,
    endTime?: Date | null
  ): Promise<GroomerAvailabilityStatus> => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // 1. Check time off first
      const timeOffRequests = await staffService.getStaffTimeOff(groomerId);
      const approvedTimeOff = timeOffRequests.filter(
        (to) => to.status === 'APPROVED'
      );

      for (const timeOff of approvedTimeOff) {
        const startDate = parseISO(timeOff.startDate);
        const endDate = parseISO(timeOff.endDate);

        if (isWithinInterval(date, { start: startDate, end: endDate })) {
          return {
            available: false,
            reason: `Off (${timeOff.type})`,
            status: 'off',
          };
        }
      }

      // 2. Check staff schedules for this specific date
      // Staff schedules represent actual shifts the groomer is working
      const schedules = await staffService.getStaffSchedules(
        groomerId,
        dateStr,
        dateStr
      );

      // Find a schedule for this date that is SCHEDULED or CONFIRMED
      const activeSchedule = schedules.find((schedule) => {
        const scheduleDate = schedule.date.split('T')[0]; // Handle ISO date format
        return (
          scheduleDate === dateStr &&
          (schedule.status === 'SCHEDULED' || schedule.status === 'CONFIRMED')
        );
      });

      if (!activeSchedule) {
        return {
          available: false,
          reason: 'Not scheduled',
          status: 'off',
        };
      }

      // 3. Check if appointment time is within the scheduled shift
      if (startTime && endTime) {
        const appointmentStart = format(startTime, 'HH:mm');
        const appointmentEnd = format(endTime, 'HH:mm');

        if (
          appointmentStart < activeSchedule.startTime ||
          appointmentEnd > activeSchedule.endTime
        ) {
          return {
            available: false,
            reason: `Works ${activeSchedule.startTime}-${activeSchedule.endTime}`,
            status: 'off',
          };
        }
      }

      // Groomer is scheduled and available for this time
      return {
        available: true,
        reason: `Available ${activeSchedule.startTime}-${activeSchedule.endTime}`,
        status: 'available',
      };
    } catch (err) {
      console.error(
        `Error checking availability for groomer ${groomerId}:`,
        err
      );
      return {
        available: false,
        reason: 'Unable to check',
        status: 'unknown',
      };
    }
  };

  /**
   * Get chip color based on availability status
   */
  const getStatusColor = (
    status: GroomerAvailabilityStatus
  ): 'success' | 'error' | 'warning' | 'default' => {
    switch (status.status) {
      case 'available':
        return 'success';
      case 'busy':
      case 'off':
        return 'error';
      case 'unknown':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading groomers...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (groomers.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        No groomers available. Please add staff with GROOMING specialty.
      </Alert>
    );
  }

  return (
    <FormControl fullWidth size="small" sx={{ mb: 2 }} required={required}>
      <InputLabel id="groomer-select-label">Assign Groomer</InputLabel>
      <Select
        labelId="groomer-select-label"
        id="groomer-select"
        value={selectedGroomerId}
        label="Assign Groomer"
        onChange={(e) => onGroomerChange(e.target.value)}
        disabled={disabled}
        MenuProps={{
          PaperProps: {
            style: {
              maxWidth: '400px',
            },
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        }}
        renderValue={(selected) => {
          if (!selected) {
            return <em>Select a groomer</em>;
          }
          const groomer = groomers.find((g) => g.id === selected);
          if (!groomer) return selected;

          const availability = groomerAvailability[selected];
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>
                {groomer.firstName} {groomer.lastName}
              </span>
              {availability && (
                <Chip
                  size="small"
                  label={availability.reason || availability.status}
                  color={getStatusColor(availability)}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          );
        }}
      >
        <MenuItem value="">
          <em>Auto-assign (any available groomer)</em>
        </MenuItem>

        {groomers.map((groomer) => {
          const availability = groomerAvailability[groomer.id!];
          const isAvailable = availability?.available !== false;

          return (
            <MenuItem
              key={groomer.id}
              value={groomer.id}
              disabled={!isAvailable && appointmentDate !== null}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <span>
                  {groomer.firstName} {groomer.lastName}
                  {groomer.specialties && groomer.specialties.length > 1 && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 1, color: 'text.secondary' }}
                    >
                      (
                      {groomer.specialties
                        .filter((s) => s !== 'GROOMING')
                        .join(', ')}
                      )
                    </Typography>
                  )}
                </span>

                {checkingAvailability ? (
                  <CircularProgress size={16} />
                ) : availability ? (
                  <Chip
                    size="small"
                    label={availability.reason || availability.status}
                    color={getStatusColor(availability)}
                    sx={{ ml: 1 }}
                  />
                ) : null}
              </Box>
            </MenuItem>
          );
        })}
      </Select>

      {!appointmentDate && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          Select an appointment date to check groomer availability
        </Typography>
      )}
    </FormControl>
  );
};

export default GroomerSelector;
