import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Today as TodayIcon,
  ChevronLeft,
  ChevronRight,
  Label as LabelIcon,
} from '@mui/icons-material';
import DashboardMetrics from '../components/dashboard/DashboardMetrics';
import ReservationList from '../components/dashboard/ReservationList';
import AnnouncementModal from '../components/announcements/AnnouncementModal';
import ResponsiveContainer from '../components/common/ResponsiveContainer';
import { useDashboardData } from '../hooks/useDashboardData';
import { usePageHelp } from '../hooks/usePageHelp';
import { useResponsive, getResponsiveButtonSize } from '../utils/responsive';
import announcementService from '../services/announcementService';
import type { Announcement } from '../components/announcements/AnnouncementModal';
import { dashboardHelp } from '../content/help/dashboardHelp';
import { useAuth } from '../contexts/AuthContext';
import BatchLabelPrintDialog from '../components/labels/BatchLabelPrintDialog';

/**
 * Dashboard component displays key business metrics and upcoming reservations.
 * Shows reservation counts (In, Out, Overnight), revenue, and recent activity.
 *
 * Refactored to use:
 * - useDashboardData hook for data management
 * - DashboardMetrics component for metric cards
 * - ReservationList component for appointment display
 */
const Dashboard = () => {
  // Set up page help
  usePageHelp(dashboardHelp);

  // Responsive hooks
  const { isMobile } = useResponsive();

  const {
    inCount,
    outCount,
    overnightCount,
    allReservations,
    filteredReservations,
    loading,
    error,
    appointmentFilter,
    selectedDate,
    setSelectedDate,
    filterReservations,
  } = useDashboardData();

  // Announcement state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const { user } = useAuth();
  const [showBatchLabelPrint, setShowBatchLabelPrint] = useState(false);

  // Reset to today when component mounts (navigating back to dashboard)
  useEffect(() => {
    setSelectedDate(new Date());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load announcements on mount
  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const data = await announcementService.getActiveAnnouncements();
    setAnnouncements(data);

    // Show modal if there are announcements
    if (data.length > 0) {
      setShowAnnouncementModal(true);
    }
  };

  const handleDismissAnnouncement = async (id: string) => {
    try {
      await announcementService.dismissAnnouncement(id);
      // Only remove if dismiss was successful
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
      // Don't remove from state if dismiss failed
      alert('Unable to dismiss announcement. Please try again later.');
    }
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date change from input
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(event.target.value + 'T00:00:00');
    setSelectedDate(newDate);
  };

  // Reset to today
  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  // Navigate to previous day
  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  return (
    <ResponsiveContainer>
      {/* Announcement Modal */}
      <AnnouncementModal
        open={showAnnouncementModal}
        announcements={announcements}
        onClose={() => setShowAnnouncementModal(false)}
        onDismiss={handleDismissAnnouncement}
        isAuthenticated={!!user}
      />

      <BatchLabelPrintDialog
        open={showBatchLabelPrint}
        onClose={() => setShowBatchLabelPrint(false)}
        reservations={allReservations}
        selectedDate={selectedDate}
      />

      {/* Header with Date Selector */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 2,
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography variant={isMobile ? 'h6' : 'h5'} component="h1">
          Dashboard
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          {/* Previous Day Button */}
          <IconButton
            size={getResponsiveButtonSize(isMobile)}
            onClick={handlePreviousDay}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              flexShrink: 0,
            }}
            title="Previous day"
          >
            <ChevronLeft />
          </IconButton>

          {/* Date Picker */}
          <TextField
            type="date"
            size={isMobile ? 'small' : 'medium'}
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              width: { xs: 140, sm: 180 },
              minWidth: 'fit-content',
              flexShrink: 1,
            }}
          />

          {/* Next Day Button */}
          <IconButton
            size={getResponsiveButtonSize(isMobile)}
            onClick={handleNextDay}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              flexShrink: 0,
            }}
            title="Next day"
          >
            <ChevronRight />
          </IconButton>

          {/* Today Button */}
          <Button
            variant="outlined"
            size={getResponsiveButtonSize(isMobile)}
            startIcon={!isMobile ? <TodayIcon /> : undefined}
            onClick={handleTodayClick}
            sx={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            {isMobile ? <TodayIcon /> : 'Today'}
          </Button>

          <Tooltip title="Print Labels">
            <IconButton
              size={getResponsiveButtonSize(isMobile)}
              onClick={() => setShowBatchLabelPrint(true)}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                flexShrink: 0,
              }}
              aria-label="Print Labels"
            >
              <LabelIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}
      >
        {/* Metrics Cards */}
        <DashboardMetrics
          inCount={inCount}
          outCount={outCount}
          overnightCount={overnightCount}
          appointmentFilter={appointmentFilter}
          onFilterChange={filterReservations}
        />

        {/* Reservations List */}
        <ReservationList
          reservations={filteredReservations}
          loading={loading}
          error={error}
          filter={appointmentFilter}
          onFilterChange={filterReservations}
        />
      </Box>
    </ResponsiveContainer>
  );
};

export default Dashboard;
