/**
 * CustomerInfo - Step 4: Customer information
 * Auto-populated from logged-in customer account
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';

interface CustomerInfoProps {
  bookingData: any;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (data: any) => void;
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({
  bookingData,
  onNext,
  onBack,
  onUpdate,
}) => {
  const { customer } = useCustomerAuth();
  const [error, setError] = useState('');

  const handleContinue = () => {
    // Data already populated from auth context
    onNext();
  };

  return (
    <Box>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
          mb: 3,
        }}
      >
        Your Information
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {/* Customer Information Display */}
      {customer && (
        <Card
          sx={{
            mb: 3,
            bgcolor: 'success.50',
            borderLeft: '4px solid',
            borderColor: 'success.main',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6" color="success.main">
                Account Verified
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Personal Information
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {customer.firstName} {customer.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {customer.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {customer.phone}
                </Typography>
              </Grid>

              {(customer.address ||
                customer.city ||
                customer.state ||
                customer.zipCode) && (
                <Grid size={12}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    Address
                  </Typography>
                  <Typography variant="body2">{customer.address}</Typography>
                  <Typography variant="body2">
                    {customer.city}, {customer.state} {customer.zipCode}
                  </Typography>
                </Grid>
              )}

              {(customer.emergencyContact || customer.emergencyPhone) && (
                <Grid size={12}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                  >
                    Emergency Contact
                  </Typography>
                  <Typography variant="body2">
                    {customer.emergencyContact}
                  </Typography>
                  <Typography variant="body2">
                    {customer.emergencyPhone}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Need to update your information? Please contact us or update your
              account settings.
            </Alert>
          </CardContent>
        </Card>
      )}
      {/* Navigation Buttons - Fixed on mobile */}
      <Box
        sx={{
          position: { xs: 'fixed', sm: 'static' },
          bottom: { xs: 0, sm: 'auto' },
          left: { xs: 0, sm: 'auto' },
          right: { xs: 0, sm: 'auto' },
          p: { xs: 2, sm: 0 },
          mt: { xs: 0, sm: 4 },
          bgcolor: { xs: 'background.paper', sm: 'transparent' },
          boxShadow: { xs: '0 -2px 10px rgba(0,0,0,0.1)', sm: 'none' },
          zIndex: { xs: 1000, sm: 'auto' },
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant="outlined"
          size="large"
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          sx={{ py: { xs: 1.5, sm: 1.5 } }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleContinue}
          endIcon={<ArrowForwardIcon />}
          sx={{ py: { xs: 1.5, sm: 1.5 } }}
        >
          Continue to Review
        </Button>
      </Box>
      {/* Spacer for fixed button on mobile */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, height: 80 }} />
    </Box>
  );
};

export default CustomerInfo;
