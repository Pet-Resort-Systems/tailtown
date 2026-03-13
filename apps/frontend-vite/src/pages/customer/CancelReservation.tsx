/**
 * Cancel Reservation Page
 * 
 * Allows customers to cancel a reservation with:
 * - Cancellation policy display
 * - Refund calculation
 * - Reason selection
 * - Confirmation dialog
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Paper,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { reservationManagementService } from '../../services/reservationManagementService';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import {
  CancellationReason,
  CancellationResult,
  ReservationDetails
} from '../../types/reservationManagement';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const CancelReservation: React.FC = () => {
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId: string }>();
  const { customer } = useCustomerAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [reason, setReason] = useState<CancellationReason>('OTHER');
  const [reasonDetails, setReasonDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cancellationResult, setCancellationResult] = useState<CancellationResult | null>(null);

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
      
      if (!data.canCancel) {
        setError('This reservation cannot be cancelled.');
      }
      
      setReservation(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!reservationId || !customer?.id) return;

    try {
      setSubmitting(true);
      setError(null);

      const result = await reservationManagementService.cancelReservation({
        reservationId,
        reason,
        reasonDetails: reasonDetails.trim() || undefined,
        requestedBy: customer.id,
        requestedAt: new Date().toISOString()
      });

      setCancellationResult(result);
      setShowConfirmDialog(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel reservation');
      setShowConfirmDialog(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !reservation) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
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

  if (!reservation) {
    return (
      <Box p={3}>
        <Alert severity="error">Reservation not found</Alert>
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

  // Success state
  if (cancellationResult) {
    return (
      <Box>
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Reservation Cancelled
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {cancellationResult.message}
              </Typography>

              <Paper variant="outlined" sx={{ p: 3, maxWidth: 400, mx: 'auto', my: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Refund Information
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Refund Amount:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(cancellationResult.refundAmount)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Refund Percentage:</Typography>
                    <Typography variant="body2">
                      {cancellationResult.refundPercentage}%
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Status:</Typography>
                    <Typography variant="body2" color="warning.main">
                      {cancellationResult.refundStatus}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                Your refund will be processed within 5-7 business days and will appear
                on your original payment method.
              </Alert>

              <Button
                variant="contained"
                onClick={() => navigate('/my-reservations')}
              >
                Back to Reservations
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(`/my-reservations/${reservationId}`)}
          sx={{ mb: 2 }}
        >
          Back to Details
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Cancel Reservation
        </Typography>
        {reservation.orderNumber && (
          <Typography variant="body2" color="text.secondary">
            Order #{reservation.orderNumber}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Warning */}
      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">
          Are you sure you want to cancel this reservation?
        </Typography>
        <Typography variant="body2">
          This action cannot be undone. Please review the cancellation policy below.
        </Typography>
      </Alert>

      {/* Reservation Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reservation Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Check-in:</Typography>
              <Typography variant="body2">{formatDate(reservation.startDate)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Check-out:</Typography>
              <Typography variant="body2">{formatDate(reservation.endDate)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Pet:</Typography>
              <Typography variant="body2">{reservation.pet?.name}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Service:</Typography>
              <Typography variant="body2">{reservation.service?.name}</Typography>
            </Box>
            <Divider />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body1" fontWeight="bold">Total Paid:</Typography>
              <Typography variant="body1" fontWeight="bold">
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

      {/* Cancellation Policy */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cancellation Policy
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {reservation.cancellationPolicy && (
            <>
              <Typography variant="body2" paragraph>
                {reservation.cancellationPolicy.description}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="h6" gutterBottom>
                  Your Refund
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(reservation.refundAmount)}
                </Typography>
                <Typography variant="body2">
                  {reservation.refundPercentage}% of total ({reservation.daysUntilCheckIn} days until check-in)
                </Typography>
              </Paper>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancellation Reason */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reason for Cancellation
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <FormControl component="fieldset">
            <FormLabel component="legend">Please select a reason:</FormLabel>
            <RadioGroup
              value={reason}
              onChange={(e) => setReason(e.target.value as CancellationReason)}
            >
              <FormControlLabel
                value="SCHEDULE_CONFLICT"
                control={<Radio />}
                label="Schedule conflict"
              />
              <FormControlLabel
                value="PET_HEALTH"
                control={<Radio />}
                label="Pet health issue"
              />
              <FormControlLabel
                value="TRAVEL_CANCELLED"
                control={<Radio />}
                label="Travel plans cancelled"
              />
              <FormControlLabel
                value="FOUND_ALTERNATIVE"
                control={<Radio />}
                label="Found alternative care"
              />
              <FormControlLabel
                value="PRICE_CONCERN"
                control={<Radio />}
                label="Price concern"
              />
              <FormControlLabel
                value="OTHER"
                control={<Radio />}
                label="Other"
              />
            </RadioGroup>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Details (Optional)"
            value={reasonDetails}
            onChange={(e) => setReasonDetails(e.target.value)}
            placeholder="Please provide any additional information..."
            sx={{ mt: 2 }}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate(`/my-reservations/${reservationId}`)}
        >
          Keep Reservation
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => setShowConfirmDialog(true)}
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={24} /> : 'Cancel Reservation'}
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => !submitting && setShowConfirmDialog(false)}
      >
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to cancel this reservation?
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You will receive a refund of {formatCurrency(reservation.refundAmount)} 
            ({reservation.refundPercentage}% of total).
          </Alert>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            disabled={submitting}
          >
            No, Keep Reservation
          </Button>
          <Button
            onClick={handleCancelReservation}
            color="error"
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CancelReservation;
