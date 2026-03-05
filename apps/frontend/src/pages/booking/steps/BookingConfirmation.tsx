/**
 * BookingConfirmation - Final step: Booking confirmation
 * Shows success message and booking details
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Print as PrintIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';

interface BookingConfirmationProps {
  bookingData: any;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ bookingData }) => {
  const { customer } = useCustomerAuth();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Success Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <CheckCircleIcon 
          sx={{ 
            fontSize: { xs: 80, sm: 100 }, 
            color: 'success.main', 
            mb: 2 
          }} 
        />
        <Typography 
          variant="h4" 
          component="h1"
          gutterBottom
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            fontWeight: 700,
            color: 'success.main'
          }}
        >
          Booking Confirmed!
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}
        >
          Thank you for booking with Tailtown Pet Resort
        </Typography>
      </Box>

      {/* Confirmation Alert */}
      <Alert severity="success" icon={<EmailIcon />} sx={{ mb: 4 }}>
        <Typography variant="body1" fontWeight={600}>
          Confirmation email sent to {customer?.email}
        </Typography>
        <Typography variant="body2">
          Please check your inbox for booking details and next steps.
        </Typography>
      </Alert>

      {/* Booking Details */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Booking Details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            {bookingData.reservationId && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Confirmation Number:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {bookingData.reservationId.substring(0, 8).toUpperCase()}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Service:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {bookingData.serviceName}
                </Typography>
              </Box>
            </Grid>

            {bookingData.startDate && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Date:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {new Date(bookingData.startDate).toLocaleDateString()}
                    {bookingData.endDate && ` - ${new Date(bookingData.endDate).toLocaleDateString()}`}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Pets:
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {bookingData.petIds?.length || 0} pet(s)
                </Typography>
              </Box>
            </Grid>

            {bookingData.addOnIds && bookingData.addOnIds.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Add-Ons:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {bookingData.addOnIds.length} selected
                  </Typography>
                </Box>
              </Grid>
            )}

            {bookingData.paymentTransactionId && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Method:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {bookingData.maskedCard || 'Credit Card'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {bookingData.paymentTransactionId}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card sx={{ mb: 4, bgcolor: 'primary.50' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            What's Next?
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              You'll receive a confirmation email with all booking details
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              We'll send you a reminder 24 hours before your appointment
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Please arrive 10 minutes early for check-in
            </Typography>
            <Typography component="li" variant="body2">
              Bring your pet's vaccination records if this is your first visit
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Button
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ py: 1.5 }}
          >
            Print Confirmation
          </Button>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<CalendarIcon />}
            href="/book"
            sx={{ py: 1.5 }}
          >
            Book Another
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<HomeIcon />}
            href="/"
            sx={{ py: 1.5 }}
          >
            Return to Home
          </Button>
        </Grid>
      </Grid>

      {/* Contact Information */}
      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Need Help?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Call us at (555) 123-4567
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Email: info@tailtown.com
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookingConfirmation;
