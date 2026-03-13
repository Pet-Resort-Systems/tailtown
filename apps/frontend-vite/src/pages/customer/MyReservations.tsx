/**
 * My Reservations Page
 * 
 * Customer-facing reservation management dashboard.
 * Allows customers to:
 * - View all their reservations
 * - Filter by status (upcoming, past, cancelled)
 * - View reservation details
 * - Modify reservations
 * - Cancel reservations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Pets as PetsIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { reservationManagementService } from '../../services/reservationManagementService';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import {
  CustomerReservationDashboard,
  ReservationSummary,
  ReservationFilter
} from '../../types/reservationManagement';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const MyReservations: React.FC = () => {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<CustomerReservationDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<ReservationFilter>('UPCOMING');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer?.id) {
      loadDashboard();
    }
  }, [customer]);

  const loadDashboard = async () => {
    if (!customer?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await reservationManagementService.getCustomerDashboard(customer.id);
      setDashboard(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const getReservationsForTab = (): ReservationSummary[] => {
    if (!dashboard) return [];
    
    switch (activeTab) {
      case 'UPCOMING':
        return dashboard.upcoming;
      case 'PAST':
        return dashboard.past;
      case 'CANCELLED':
        return dashboard.cancelled;
      default:
        return [...dashboard.upcoming, ...dashboard.past, ...dashboard.cancelled];
    }
  };

  const handleViewDetails = (reservationId: string) => {
    navigate(`/my-reservations/${reservationId}`);
  };

  const handleModify = (reservationId: string) => {
    navigate(`/my-reservations/${reservationId}/modify`);
  };

  const handleCancel = (reservationId: string) => {
    navigate(`/my-reservations/${reservationId}/cancel`);
  };

  if (!customer) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          Please log in to view your reservations.
        </Alert>
      </Box>
    );
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
      <Box p={3}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  const reservations = getReservationsForTab();

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Reservations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your pet boarding reservations
        </Typography>
      </Box>

      {/* Summary Cards */}
      {dashboard && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Upcoming
                </Typography>
                <Typography variant="h4">
                  {dashboard.upcomingCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Reservations
                </Typography>
                <Typography variant="h4">
                  {dashboard.totalReservations}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Spent
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(dashboard.totalSpent)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => navigate('/booking')}
                >
                  New Reservation
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box mb={3}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Upcoming" value="UPCOMING" />
          <Tab label="Past" value="PAST" />
          <Tab label="Cancelled" value="CANCELLED" />
          <Tab label="All" value="ALL" />
        </Tabs>
      </Box>

      {/* Reservations List */}
      {reservations.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No {activeTab.toLowerCase()} reservations
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {activeTab === 'UPCOMING' 
                  ? "You don't have any upcoming reservations."
                  : `You don't have any ${activeTab.toLowerCase()} reservations.`}
              </Typography>
              {activeTab === 'UPCOMING' && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/booking')}
                >
                  Make a Reservation
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {reservations.map((reservation) => (
            <Grid item xs={12} key={reservation.id}>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    {/* Status and Order Number */}
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Chip
                          label={reservationManagementService.getStatusLabel(reservation.status)}
                          color={reservationManagementService.getStatusColor(reservation.status)}
                          size="small"
                        />
                        {reservation.orderNumber && (
                          <Typography variant="caption" color="text.secondary">
                            Order #{reservation.orderNumber}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Dates */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Check-in
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(reservation.startDate)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Check-out
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(reservation.endDate)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Pet and Service */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PetsIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Pet
                          </Typography>
                          <Typography variant="body2">
                            {reservation.petName}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <MoneyIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Total
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(reservation.totalPrice)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Service Name */}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {reservation.serviceName}
                      </Typography>
                      {reservation.daysUntilCheckIn > 0 && reservation.daysUntilCheckIn <= 7 && (
                        <Typography variant="caption" color="warning.main">
                          Check-in in {reservation.daysUntilCheckIn} day{reservation.daysUntilCheckIn !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewDetails(reservation.id)}
                  >
                    View Details
                  </Button>
                  {reservation.canModify && (
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleModify(reservation.id)}
                    >
                      Modify
                    </Button>
                  )}
                  {reservation.canCancel && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => handleCancel(reservation.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyReservations;
