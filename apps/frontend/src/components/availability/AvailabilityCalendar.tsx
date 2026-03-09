/**
 * Availability Calendar Component
 * 
 * Displays a month view calendar showing availability status for each day.
 * Features:
 * - Color-coded availability status
 * - Click to select dates
 * - Hover for details
 * - Legend for status colors
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Circle as DotIcon
} from '@mui/icons-material';
import { availabilityService } from '../../services/availabilityService';
import { AvailabilityCalendar as AvailabilityCalendarType, DateAvailability } from '../../types/availability';

interface AvailabilityCalendarProps {
  serviceId?: string;
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  serviceId,
  onDateSelect,
  selectedDate,
  minDate,
  maxDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState<AvailabilityCalendarType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalendar();
  }, [currentMonth, currentYear, serviceId]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await availabilityService.getAvailabilityCalendar(
        currentYear,
        currentMonth,
        serviceId
      );
      setCalendar(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (date: DateAvailability) => {
    if (availabilityService.isPastDate(date.date)) return;
    if (minDate && date.date < minDate) return;
    if (maxDate && date.date > maxDate) return;
    if (date.status === 'UNAVAILABLE') return;
    
    if (onDateSelect) {
      onDateSelect(date.date);
    }
  };

  const getDateColor = (date: DateAvailability): string => {
    if (availabilityService.isPastDate(date.date)) return '#e0e0e0';
    if (minDate && date.date < minDate) return '#e0e0e0';
    if (maxDate && date.date > maxDate) return '#e0e0e0';
    
    const statusColors = {
      AVAILABLE: '#4caf50',
      PARTIALLY_AVAILABLE: '#ff9800',
      UNAVAILABLE: '#f44336',
      WAITLIST: '#2196f3'
    };
    
    return statusColors[date.status] || '#e0e0e0';
  };

  const isDateSelected = (date: string): boolean => {
    return selectedDate === date;
  };

  const isDateDisabled = (date: DateAvailability): boolean => {
    if (availabilityService.isPastDate(date.date)) return true;
    if (minDate && date.date < minDate) return true;
    if (maxDate && date.date > maxDate) return true;
    if (date.status === 'UNAVAILABLE') return true;
    return false;
  };

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get first day of month and total days
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create calendar grid
  const calendarDays: (DateAvailability | null)[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateData = calendar?.dates.find(d => d.date === dateString);
    
    if (dateData) {
      calendarDays.push(dateData);
    } else {
      // Default data if not loaded
      calendarDays.push({
        date: dateString,
        status: 'AVAILABLE',
        availableCount: 0,
        totalCount: 0,
        availableSuites: []
      });
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <IconButton onClick={handlePreviousMonth} size="small">
          <PrevIcon />
        </IconButton>
        <Typography variant="h6">{monthName}</Typography>
        <IconButton onClick={handleNextMonth} size="small">
          <NextIcon />
        </IconButton>
      </Box>

      {/* Week day headers */}
      <Grid container spacing={1} mb={1}>
        {weekDays.map((day) => (
          <Grid item xs={12/7} key={day}>
            <Typography variant="caption" align="center" display="block" fontWeight="bold">
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar grid */}
      <Grid container spacing={1}>
        {calendarDays.map((date, index) => (
          <Grid item xs={12/7} key={index}>
            {date ? (
              <Tooltip
                title={
                  <Box>
                    <Typography variant="body2">
                      {availabilityService.getStatusLabel(date.status)}
                    </Typography>
                    <Typography variant="caption">
                      {availabilityService.formatCapacity(date.availableCount, date.totalCount)}
                    </Typography>
                    {date.price && (
                      <Typography variant="caption" display="block">
                        ${date.price}/night
                      </Typography>
                    )}
                  </Box>
                }
              >
                <Box
                  onClick={() => handleDateClick(date)}
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    borderRadius: 1,
                    cursor: isDateDisabled(date) ? 'not-allowed' : 'pointer',
                    backgroundColor: isDateSelected(date.date) ? 'primary.main' : 'transparent',
                    color: isDateSelected(date.date) ? 'white' : 'inherit',
                    border: `2px solid ${getDateColor(date)}`,
                    opacity: isDateDisabled(date) ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: isDateDisabled(date) 
                        ? 'transparent' 
                        : isDateSelected(date.date) 
                          ? 'primary.dark' 
                          : 'action.hover'
                    }
                  }}
                >
                  <Typography variant="body2">
                    {new Date(date.date).getDate()}
                  </Typography>
                  <DotIcon sx={{ fontSize: 8, color: getDateColor(date) }} />
                </Box>
              </Tooltip>
            ) : (
              <Box sx={{ p: 1 }} />
            )}
          </Grid>
        ))}
      </Grid>

      {/* Legend */}
      <Box mt={2} display="flex" gap={2} flexWrap="wrap" justifyContent="center">
        <Chip
          icon={<DotIcon sx={{ fontSize: 12, color: '#4caf50' }} />}
          label="Available"
          size="small"
          variant="outlined"
        />
        <Chip
          icon={<DotIcon sx={{ fontSize: 12, color: '#ff9800' }} />}
          label="Limited"
          size="small"
          variant="outlined"
        />
        <Chip
          icon={<DotIcon sx={{ fontSize: 12, color: '#f44336' }} />}
          label="Full"
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Summary */}
      {calendar && (
        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            {calendar.summary.availableDays} available days this month
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AvailabilityCalendar;
