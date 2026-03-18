/**
 * UpcomingReservations - View and manage upcoming reservations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Pets as PetsIcon,
  Hotel as HotelIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';
import customerAccountService, {
  CustomerReservation,
} from '../../../services/customerAccountService';

const getStatusColor = (
  status: string
): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (status?.toUpperCase()) {
    case 'CONFIRMED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'CHECKED_IN':
      return 'primary';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
};

const UpcomingReservations: React.FC = () => {
  const { customer } = useCustomerAuth();
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<CustomerReservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadReservations = useCallback(async () => {
    if (!customer?.id) return;
    try {
      setLoading(true);
      setError('');
      const data = await customerAccountService.getUpcomingReservations(
        customer.id
      );
      setReservations(data);
    } catch (err: any) {
      console.error('Error loading reservations:', err);
      setError('Unable to load reservations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleCancelClick = (reservation: CustomerReservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedReservation) return;

    try {
      setCancelling(true);
      await customerAccountService.cancelReservation(
        selectedReservation.id,
        cancelReason
      );
      setCancelDialogOpen(false);
      setCancelReason('');
      setSelectedReservation(null);
      loadReservations(); // Refresh list
    } catch (err: any) {
      setError(
        'Unable to cancel reservation. Please contact us for assistance.'
      );
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = (reservation: CustomerReservation): boolean => {
    // Allow cancellation if more than 24 hours before start
    const startDate = parseISO(reservation.startDate);
    return isAfter(startDate, addDays(new Date(), 1));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
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

  if (reservations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Upcoming Reservations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You don't have any upcoming reservations scheduled.
        </Typography>
        <Button variant="contained" href="/book">
          Book Now
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Upcoming Reservations ({reservations.length})
      </Typography>

      <Grid container spacing={2}>
        {reservations.map((reservation) => (
          <Grid item xs={12} key={reservation.id}>
            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {reservation.service?.name || 'Reservation'}
                    </Typography>
                    {reservation.orderNumber && (
                      <Typography variant="caption" color="text.secondary">
                        Order #{reservation.orderNumber}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={reservation.status}
                    color={getStatusColor(reservation.status)}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon
                        sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }}
                      />
                      <Typography variant="body2">
                        {format(
                          parseISO(reservation.startDate),
                          'EEE, MMM d, yyyy'
                        )}
                        {reservation.endDate &&
                          reservation.endDate !== reservation.startDate && (
                            <>
                              {' '}
                              -{' '}
                              {format(
                                parseISO(reservation.endDate),
                                'EEE, MMM d, yyyy'
                              )}
                            </>
                          )}
                      </Typography>
                    </Box>

                    {reservation.pet && (
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                      >
                        <PetsIcon
                          sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }}
                        />
                        <Typography variant="body2">
                          {reservation.pet.name}
                          {reservation.pet.breed &&
                            ` (${reservation.pet.breed})`}
                        </Typography>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    {reservation.resource && (
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                      >
                        <HotelIcon
                          sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }}
                        />
                        <Typography variant="body2">
                          {reservation.resource.name}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="primary"
                      >
                        ${reservation.totalPrice?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {reservation.notes && (
                  <Box
                    sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Notes: {reservation.notes}
                    </Typography>
                  </Box>
                )}

                {canCancel(reservation) &&
                  reservation.status !== 'CANCELLED' && (
                    <Box
                      sx={{
                        mt: 2,
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => handleCancelClick(reservation)}
                      >
                        Cancel Reservation
                      </Button>
                    </Box>
                  )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Reservation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to cancel this reservation? This action cannot
            be undone.
          </Typography>
          <TextField
            label="Reason for cancellation (optional)"
            fullWidth
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            disabled={cancelling}
          >
            Keep Reservation
          </Button>
          <Button
            onClick={handleCancelConfirm}
            color="error"
            variant="contained"
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UpcomingReservations;
