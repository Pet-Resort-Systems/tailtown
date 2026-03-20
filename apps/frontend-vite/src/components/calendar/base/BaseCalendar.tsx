import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { BaseCalendarProps, ViewType } from './types';
import useCalendarEvents from './useCalendarEvents';

/**
 * Base calendar component with common functionality
 */
const BaseCalendar: React.FC<BaseCalendarProps> = ({
  serviceCategories,
  calendarTitle = 'Calendar',
  initialView = 'timeGridWeek',
  initialDate,
  showWeekends = true,
  showHeader = true,
  allowEventCreation = true,
  allowEventEditing = true,
  onEventChange: _onEventChange,
  onDateSelect,
  onEventClick,
  children,
}) => {
  // State for current view
  const [viewType, _setViewType] = useState<ViewType>(initialView as ViewType);

  // Use the calendar events hook
  const {
    events,
    loading,
    error,
    currentDate: _currentDate,
    setCurrentDate: _setCurrentDate,
    refreshEvents,
  } = useCalendarEvents({
    serviceCategories,
    initialDate,
  });

  // Event handlers
  const handleDateSelect = (selectInfo: any) => {
    if (allowEventCreation && onDateSelect) {
      onDateSelect(selectInfo);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    if (allowEventEditing && onEventClick) {
      onEventClick(clickInfo);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', p: 2 }}>
      {showHeader && (
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6">
            {calendarTitle} ({events.length} reservations)
          </Typography>
          <Button
            variant="outlined"
            onClick={refreshEvents}
            size="small"
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>
      )}

      <Paper
        elevation={3}
        sx={{ height: showHeader ? 'calc(100% - 60px)' : '100%', p: 2 }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{error}</Typography>
            <Button variant="contained" onClick={refreshEvents} sx={{ mt: 2 }}>
              Retry
            </Button>
          </Box>
        ) : (
          <>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              initialView={viewType}
              editable={allowEventEditing}
              selectable={allowEventCreation}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={showWeekends}
              events={events}
              select={handleDateSelect}
              eventClick={handleEventClick}
              height="100%"
              slotMinTime="06:00:00"
              slotMaxTime="20:00:00"
              eventColor="#4c8bf5"
              eventTextColor="#ffffff"
              timeZone="local"
              locale="en-US"
              // Fixed time format settings using object notation instead of strings
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }}
              buttonText={{
                today: 'Today',
                month: 'Month',
                week: 'Week',
                day: 'Day',
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
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
                omitCommas: true,
              }}
            />

            {children}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default BaseCalendar;
