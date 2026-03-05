/**
 * Capacity Full Dialog
 * 
 * Shows when a service is at full capacity and offers to join waitlist
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import { EventBusy as FullIcon, NotificationsActive as WaitlistIcon } from '@mui/icons-material';
import waitlistService from '../../services/waitlistService';

interface CapacityFullDialogProps {
  open: boolean;
  onClose: () => void;
  serviceType: string;
  startDate: string;
  endDate?: string;
  customerId: string;
  petId: string;
  availableSpots: number;
  requestedSpots: number;
  onWaitlistJoined?: () => void;
}

const CapacityFullDialog: React.FC<CapacityFullDialogProps> = ({
  open,
  onClose,
  serviceType,
  startDate,
  endDate,
  customerId,
  petId,
  availableSpots,
  requestedSpots,
  onWaitlistJoined
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleJoinWaitlist = async () => {
    setLoading(true);
    setError(null);

    try {
      await waitlistService.addToWaitlist({
        customerId,
        petId,
        serviceType: serviceType as any,
        requestedStartDate: startDate,
        requestedEndDate: endDate,
        flexibleDates: true,
        dateFlexibilityDays: 3,
        preferences: {},
        customerNotes: `Requested ${requestedSpots} spot(s), but only ${availableSpots} available`
      });

      setSuccess(true);
      
      if (onWaitlistJoined) {
        onWaitlistJoined();
      }

      // Close after showing success message
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FullIcon color="warning" />
          <Typography variant="h6">Service at Full Capacity</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully joined the waitlist! We'll notify you when a spot opens up.
          </Alert>
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{serviceType}</strong> is currently at full capacity for your requested dates.
              </Typography>
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Requested Dates:</strong>
              </Typography>
              <Typography variant="body2">
                {formatDate(startDate)}
                {endDate && ` - ${formatDate(endDate)}`}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Capacity Status:</strong>
              </Typography>
              <Typography variant="body2">
                Only <strong>{availableSpots}</strong> spot(s) available, but you requested <strong>{requestedSpots}</strong>
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                bgcolor: 'primary.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.200'
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WaitlistIcon color="primary" />
                <Typography variant="subtitle2" color="primary">
                  Join the Waitlist
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                We'll automatically notify you via email when a spot becomes available. 
                You'll have 24 hours to confirm your booking.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {!success && (
          <Button
            variant="contained"
            onClick={handleJoinWaitlist}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <WaitlistIcon />}
          >
            {loading ? 'Joining...' : 'Join Waitlist'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CapacityFullDialog;
