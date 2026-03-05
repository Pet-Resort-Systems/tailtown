/**
 * Reservation Details Page
 * 
 * Detailed view of a single reservation including:
 * - Full reservation information
 * - Modification history
 * - Cancellation policy
 * - Actions (modify, cancel)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { reservationManagementService } from '../../services/reservationManagementService';
import { ReservationDetails as ReservationDetailsType } from '../../types/reservationManagement';
import { formatDate, formatCurrency, formatDateTime } from '../../utils/formatters';

export const ReservationDetails: React.FC = () => {
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<ReservationDetailsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancellationInfo, setShowCancellationInfo] = useState(false);

  useEffect(() => {
    if (reservationId) {
      loadReservationDetails();
    }
  }, [reservationId]);

  const loadReservationDetails = async () => {
    if (!reservationId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await reservationManagementService.getReservationDetails(reservationId);
      setReservation(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !reservation) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error || 'Reservation not found'}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/my-reservations')}
          sx={{ mt: 2 }}
        >
          Back to Reservations
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/my-reservations')}
          sx={{ mb: 2 }}
        >
          Back to Reservations
        </Button>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Reservation Details
            </Typography>
            {reservation.orderNumber && (
              <Typography variant="body2" color="text.secondary">
                Order #{reservation.orderNumber}
              </Typography>
            )}
          </Box>
          <Chip
            label={reservationManagementService.getStatusLabel(reservation.status)}
            color={reservationManagementService.getStatusColor(reservation.status)}
          />
        </Box>
      </Box>

      {/* Warning for upcoming check-in */}
      {reservation.daysUntilCheckIn > 0 && reservation.daysUntilCheckIn <= 3 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Check-in is in {reservation.daysUntilCheckIn} day{reservation.daysUntilCheckIn !== 1 ? 's' : ''}!
          {!reservation.canModify && ' Modifications are no longer allowed.'}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reservation Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Check-in Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDate(reservation.startDate)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Check-out Date
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDate(reservation.endDate)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Pet
                  </Typography>
                  <Typography variant="body1">
                    {reservation.pet?.name} ({reservation.pet?.breed})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Service
                  </Typography>
                  <Typography variant="body1">
                    {reservation.service?.name}
                  </Typography>
                </Grid>
                {reservation.resource && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Suite/Kennel
                    </Typography>
                    <Typography variant="body1">
                      {reservation.resource.name}
                    </Typography>
                  </Grid>
                )}
                {reservation.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {reservation.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Add-ons */}
          {reservation.addOnServices && reservation.addOnServices.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Add-on Services
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {reservation.addOnServices.map((addOn, index) => (
                    <ListItem key={index} divider={index < reservation.addOnServices!.length - 1}>
                      <ListItemText
                        primary={addOn.name || addOn.addOn?.name}
                        secondary={addOn.addOn?.description}
                      />
                      <Typography variant="body2">
                        {formatCurrency(addOn.price)}
                        {addOn.quantity && addOn.quantity > 1 && ` × ${addOn.quantity}`}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Modification History */}
          {reservation.modificationHistory && reservation.modificationHistory.length > 0 && (
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <HistoryIcon />
                  <Typography variant="h6">
                    Modification History
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {reservation.modificationHistory.map((mod, index) => (
                    <ListItem key={mod.id} divider={index < reservation.modificationHistory.length - 1}>
                      <ListItemText
                        primary={reservationManagementService.formatModificationType(mod.modificationType)}
                        secondary={
                          <>
                            {formatDateTime(typeof mod.modifiedAt === 'string' ? mod.modifiedAt : mod.modifiedAt.toISOString())}
                            {mod.notes && ` • ${mod.notes}`}
                          </>
                        }
                      />
                      <Chip
                        label={mod.modifiedBy}
                        size="small"
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Pricing */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pricing
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Service</Typography>
                  <Typography variant="body2">
                    {formatCurrency(reservation.service?.price || 0)}
                  </Typography>
                </Box>
                {reservation.addOnServices && reservation.addOnServices.length > 0 && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Add-ons</Typography>
                    <Typography variant="body2">
                      {formatCurrency(
                        reservation.addOnServices.reduce((sum, addon) => 
                          sum + (addon.price * (addon.quantity || 1)), 0
                        )
                      )}
                    </Typography>
                  </Box>
                )}
                {reservation.discount && reservation.discount > 0 && (
                  <Box display="flex" justifyContent="space-between" color="success.main">
                    <Typography variant="body2">Discount</Typography>
                    <Typography variant="body2">
                      -{formatCurrency(reservation.discount)}
                    </Typography>
                  </Box>
                )}
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6">
                    {formatCurrency(
                      (reservation.service?.price || 0) +
                      (reservation.addOnServices?.reduce((sum, addon) => 
                        sum + (addon.price * (addon.quantity || 1)), 0
                      ) || 0) -
                      (reservation.discount || 0)
                    )}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {reservation.canModify && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    fullWidth
                    onClick={() => navigate(`/my-reservations/${reservation.id}/modify`)}
                  >
                    Modify Reservation
                  </Button>
                )}
                {reservation.canCancel && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    fullWidth
                    onClick={() => navigate(`/my-reservations/${reservation.id}/cancel`)}
                  >
                    Cancel Reservation
                  </Button>
                )}
                {!reservation.canModify && !reservation.canCancel && (
                  <Alert severity="info" icon={<InfoIcon />}>
                    This reservation cannot be modified or cancelled.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Cancellation Policy */}
          {reservation.canCancel && reservation.cancellationPolicy && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cancellation Policy
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" paragraph>
                  {reservation.cancellationPolicy.description}
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="caption" color="text.secondary">
                    If cancelled now:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {reservation.refundPercentage}% refund
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(reservation.refundAmount)}
                  </Typography>
                </Paper>
                <Button
                  size="small"
                  onClick={() => setShowCancellationInfo(true)}
                  sx={{ mt: 1 }}
                >
                  View Full Policy
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Cancellation Policy Dialog */}
      <Dialog
        open={showCancellationInfo}
        onClose={() => setShowCancellationInfo(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancellation Policy</DialogTitle>
        <DialogContent>
          {reservation.cancellationPolicy && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {reservation.cancellationPolicy.name}
              </Typography>
              <Typography variant="body2" paragraph>
                {reservation.cancellationPolicy.description}
              </Typography>
              <Alert severity="info">
                <Typography variant="body2">
                  Cancellations made {reservation.cancellationPolicy.daysBeforeCheckIn} or more days
                  before check-in receive a {reservation.cancellationPolicy.refundPercentage}% refund.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancellationInfo(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReservationDetails;
