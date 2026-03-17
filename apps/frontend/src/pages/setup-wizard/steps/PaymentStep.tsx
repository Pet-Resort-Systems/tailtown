/**
 * Payment Step - CardConnect merchant setup
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Checkbox,
  FormGroup,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowForward,
  ArrowBack,
  Visibility,
  VisibilityOff,
  CreditCard,
} from '@mui/icons-material';
import { useSetupWizard } from '../SetupWizardContext';

export default function PaymentStep() {
  const { state, setPayment, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { payment } = state;
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateCardConnect = (field: string, value: string | boolean) => {
    setPayment({
      cardConnect: { ...payment.cardConnect, [field]: value },
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleCard = (card: 'visa' | 'mastercard' | 'amex' | 'discover') => {
    const cards = payment.acceptedCards.includes(card)
      ? payment.acceptedCards.filter((c) => c !== card)
      : [...payment.acceptedCards, card];
    setPayment({ acceptedCards: cards });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!payment.cardConnect.merchantId)
      newErrors.merchantId = 'Merchant ID is required';
    if (!payment.cardConnect.apiUsername)
      newErrors.apiUsername = 'API Username is required';
    if (!payment.cardConnect.apiPassword)
      newErrors.apiPassword = 'API Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      completeStep('payment');
      nextStep();
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Payment Setup
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Configure your CardConnect merchant account for payment processing.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Don't have a CardConnect account? Contact our team to get set up with
          competitive rates.
        </Typography>
      </Alert>

      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <CreditCard color="primary" />
            <Typography variant="h6">CardConnect Credentials</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Merchant ID"
                value={payment.cardConnect.merchantId}
                onChange={(e) =>
                  updateCardConnect('merchantId', e.target.value)
                }
                error={!!errors.merchantId}
                helperText={errors.merchantId}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Username"
                value={payment.cardConnect.apiUsername}
                onChange={(e) =>
                  updateCardConnect('apiUsername', e.target.value)
                }
                error={!!errors.apiUsername}
                helperText={errors.apiUsername}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Password"
                type={showPassword ? 'text' : 'password'}
                value={payment.cardConnect.apiPassword}
                onChange={(e) =>
                  updateCardConnect('apiPassword', e.target.value)
                }
                error={!!errors.apiPassword}
                helperText={errors.apiPassword}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={payment.cardConnect.testMode}
                    onChange={(e) =>
                      updateCardConnect('testMode', e.target.checked)
                    }
                  />
                }
                label="Test Mode (use sandbox for testing)"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Accepted Cards
          </Typography>
          <FormGroup row>
            {(['visa', 'mastercard', 'amex', 'discover'] as const).map(
              (card) => (
                <FormControlLabel
                  key={card}
                  control={
                    <Checkbox
                      checked={payment.acceptedCards.includes(card)}
                      onChange={() => toggleCard(card)}
                    />
                  }
                  label={card.charAt(0).toUpperCase() + card.slice(1)}
                />
              )
            )}
          </FormGroup>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={payment.requireCvv}
                  onChange={(e) => setPayment({ requireCvv: e.target.checked })}
                />
              }
              label="Require CVV for all transactions"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={payment.storeCards}
                  onChange={(e) => setPayment({ storeCards: e.target.checked })}
                />
              }
              label="Allow customers to save cards for future use"
            />
          </FormGroup>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleNext}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
