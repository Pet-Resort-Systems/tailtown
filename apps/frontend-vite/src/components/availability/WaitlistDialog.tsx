/**
 * Waitlist Dialog Component
 *
 * Allows customers to join waitlist when dates are unavailable.
 * Features:
 * - Contact information
 * - Date preferences
 * - Notes/special requests
 * - Confirmation
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  NotificationsActive as WaitlistIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { availabilityService } from '../../services/availabilityService';
import { WaitlistRequest, WaitlistEntry } from '../../types/availability';

interface WaitlistDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  serviceId: string;
  requestedStartDate: string;
  requestedEndDate: string;
  numberOfPets: number;
  customerEmail?: string;
  customerPhone?: string;
}

export const WaitlistDialog: React.FC<WaitlistDialogProps> = ({
  open,
  onClose,
  customerId,
  serviceId,
  requestedStartDate,
  requestedEndDate,
  numberOfPets,
  customerEmail = '',
  customerPhone = '',
}) => {
  const [email, setEmail] = useState(customerEmail);
  const [phone, setPhone] = useState(customerPhone);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(
    null
  );

  const handleJoinWaitlist = async () => {
    // Validation
    if (!email || !phone) {
      setError('Please provide both email and phone number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: WaitlistRequest = {
        customerId,
        serviceId,
        requestedStartDate,
        requestedEndDate,
        numberOfPets,
        contactEmail: email,
        contactPhone: phone,
        notes: notes.trim() || undefined,
      };

      const entry = await availabilityService.joinWaitlist(request);
      setWaitlistEntry(entry);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail(customerEmail);
    setPhone(customerPhone);
    setNotes('');
    setError(null);
    setSuccess(false);
    setWaitlistEntry(null);
    onClose();
  };

  const dateRange = availabilityService.formatDateRange(
    requestedStartDate,
    requestedEndDate
  );

  // Success state
  if (success && waitlistEntry) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box textAlign="center" py={3}>
            <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              You're on the Waitlist!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We'll notify you as soon as a spot opens up for your requested
              dates.
            </Typography>

            <Box mt={3} p={2} bgcolor="background.default" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>
                Waitlist Details
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box textAlign="left">
                <Typography variant="body2" gutterBottom>
                  <strong>Dates:</strong> {dateRange}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Pets:</strong> {numberOfPets}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Contact:</strong> {email}
                </Typography>
                <Typography variant="body2">
                  <strong>Priority:</strong> #{waitlistEntry.priority}
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              We'll contact you at {email} or {phone} when availability opens
              up.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WaitlistIcon color="primary" />
          <Typography variant="h6">Join Waitlist</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            We'll notify you if a spot becomes available for your requested
            dates.
          </Typography>
        </Box>

        {/* Requested Dates */}
        <Box mb={3} p={2} bgcolor="background.default" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Requested Dates
          </Typography>
          <Typography variant="body2">{dateRange}</Typography>
          <Typography variant="caption" color="text.secondary">
            {numberOfPets} pet{numberOfPets !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Contact Information */}
        <TextField
          fullWidth
          label="Email Address *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <TextField
          fullWidth
          label="Phone Number *"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <TextField
          fullWidth
          label="Notes (Optional)"
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special requests or preferences..."
          disabled={loading}
        />

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            You'll receive an email or text notification when a spot opens up.
            You'll have 24 hours to confirm your reservation.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleJoinWaitlist}
          variant="contained"
          disabled={loading || !email || !phone}
          startIcon={
            loading ? <CircularProgress size={20} /> : <WaitlistIcon />
          }
        >
          {loading ? 'Joining...' : 'Join Waitlist'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WaitlistDialog;
