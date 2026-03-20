/**
 * PastReservations - View reservation history
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Button,
} from '@mui/material';
import {
  History as HistoryIcon,
  CalendarMonth as CalendarIcon,
  Pets as PetsIcon,
  Hotel as HotelIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';
import customerAccountService, {
  CustomerReservation,
} from '../../../services/customerAccountService';

const getStatusColor = (
  status: string
): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'success';
    case 'CHECKED_OUT':
      return 'success';
    case 'CANCELLED':
      return 'error';
    case 'NO_SHOW':
      return 'warning';
    default:
      return 'default';
  }
};

const PastReservations: React.FC = () => {
  const { customer } = useCustomerAuth();
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(10);

  const loadReservations = useCallback(async () => {
    if (!customer?.id) return;

    try {
      setLoading(true);
      setError('');
      const data = await customerAccountService.getPastReservations(
        customer.id,
        limit
      );
      setReservations(data);
    } catch (err: any) {
      console.error('Error loading past reservations:', err);
      setError('Unable to load reservation history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id, limit]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleLoadMore = () => {
    setLimit((prev) => prev + 10);
  };

  if (loading && reservations.length === 0) {
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
        <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Past Reservations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your reservation history will appear here after your first visit.
        </Typography>
        <Button variant="contained" href="/book">
          Book Your First Stay
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Reservation History
      </Typography>

      <Grid container spacing={2}>
        {reservations.map((reservation) => (
          <Grid item xs={12} key={reservation.id}>
            <Card
              variant="outlined"
              sx={{ opacity: reservation.status === 'CANCELLED' ? 0.7 : 1 }}
            >
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
                      <Typography variant="body2" fontWeight={600}>
                        ${reservation.totalPrice?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {reservations.length >= limit && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PastReservations;
