import React, { memo, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ExtendedResource, Reservation } from '../../../hooks/useKennelData';
import KennelRow from './KennelRow';

// Define the view types
type ViewType = 'month' | 'week' | 'day';

interface KennelGridProps {
  kennels: ExtendedResource[];
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  currentDate: Date;
  viewType: ViewType;
  availabilityData: any;
  getDaysToDisplay: () => Date[];
  onCellClick: (
    kennel: ExtendedResource,
    date: Date,
    reservation?: Reservation
  ) => void;
  isKennelOccupied: (
    kennelId: string,
    date: Date
  ) => { occupied: boolean; reservation?: Reservation };
  onReservationDrop?: (
    reservationId: string,
    targetKennelId: string,
    date: Date
  ) => void;
  draggedReservation?: string | null;
  onDragStart?: (reservationId: string) => void;
  onDragEnd?: () => void;
}

/**
 * Main grid component for displaying kennels and their availability
 * Memoized to prevent unnecessary re-renders
 */
const KennelGrid: React.FC<KennelGridProps> = memo(
  ({
    kennels,
    reservations,
    loading,
    error,
    currentDate,
    viewType,
    availabilityData,
    getDaysToDisplay,
    onCellClick,
    isKennelOccupied,
    onReservationDrop,
    draggedReservation,
    onDragStart,
    onDragEnd,
  }) => {
    // Get the days to display based on view type
    const days = getDaysToDisplay();

    // Format day header based on view type
    const formatDayHeader = useCallback(
      (date: Date) => {
        switch (viewType) {
          case 'day':
            return date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            });
          case 'week':
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
            });
          case 'month':
            return date.getDate().toString();
          default:
            return date.getDate().toString();
        }
      },
      [viewType]
    );

    // Loading state
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading kennels...</Typography>
        </Box>
      );
    }

    // Error state
    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    // Empty state
    if (kennels.length === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          No kennels found. Please check your filter settings or resource
          configuration.
        </Alert>
      );
    }

    return (
      <Paper elevation={2}>
        <TableContainer
          sx={{ maxHeight: 'calc(100vh - 300px)', overflowX: 'auto' }}
        >
          <Table stickyHeader size="small">
            {/* Table Header */}
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    minWidth: 120,
                    fontWeight: 'bold',
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  Kennel
                </TableCell>
                {days.map((day, index) => {
                  // Check if this day is today
                  const today = new Date();
                  const isToday =
                    day.getDate() === today.getDate() &&
                    day.getMonth() === today.getMonth() &&
                    day.getFullYear() === today.getFullYear();

                  return (
                    <TableCell
                      key={index}
                      align="center"
                      sx={{
                        minWidth: viewType === 'day' ? 200 : 100,
                        fontWeight: isToday ? 'bold' : 'bold',
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        borderLeft: '1px solid rgba(224, 224, 224, 1)',
                        position: 'relative',
                        '&::after': isToday
                          ? {
                              content: '""',
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '3px',
                              backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            }
                          : {},
                      }}
                    >
                      {formatDayHeader(day)}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            {/* Table Body */}
            <TableBody>
              {kennels.map((kennel) => (
                <KennelRow
                  key={`${kennel.id}-${
                    (kennel as any).occupyingReservations
                      ?.map((r: any) => r.id)
                      .join(',') || 'empty'
                  }`}
                  kennel={kennel}
                  days={days}
                  viewType={viewType}
                  onCellClick={onCellClick}
                  isKennelOccupied={isKennelOccupied}
                  onReservationDrop={onReservationDrop}
                  draggedReservation={draggedReservation}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid rgba(224, 224, 224, 1)',
            backgroundColor: 'grey.50',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {kennels.length} kennels for {days.length} days
          </Typography>
        </Box>
      </Paper>
    );
  }
);

KennelGrid.displayName = 'KennelGrid';

export default KennelGrid;
