import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  FormHelperText,
} from '@mui/material';

interface PaymentStepProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  paymentAmount: number;
  onPaymentAmountChange: (amount: number) => void;
  totalAmount: number;
}

/**
 * Payment step in the checkout process
 */
const PaymentStep: React.FC<PaymentStepProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  paymentAmount,
  onPaymentAmountChange,
  totalAmount,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [checkNumber, setCheckNumber] = useState('');

  // Set initial payment method to cash if not set or invalid
  useEffect(() => {
    const validMethods = ['cash', 'credit_card', 'check', 'account'];

    if (
      !paymentMethod ||
      paymentMethod === 'undefined' ||
      !validMethods.includes(paymentMethod)
    ) {
      // Using setTimeout to ensure this happens after the current render cycle
      setTimeout(() => onPaymentMethodChange('cash'), 0);
    }
  }, [paymentMethod, onPaymentMethodChange]); // Include dependencies to avoid exhaustive deps warning

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel id="payment-method-label">Payment Method</InputLabel>
            <Select
              labelId="payment-method-label"
              id="payment-method"
              value={paymentMethod || 'cash'}
              defaultValue="cash"
              label="Payment Method"
              onChange={(e) => onPaymentMethodChange(e.target.value)}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="credit_card">Credit Card</MenuItem>
              <MenuItem value="check">Check</MenuItem>
              <MenuItem value="account">Account</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Payment Amount"
            type="number"
            value={paymentAmount.toFixed(2)}
            onChange={(e) => {
              // Parse the input value and ensure it's a valid number with 2 decimal places
              const amount = parseFloat(parseFloat(e.target.value).toFixed(2));
              onPaymentAmountChange(amount);
            }}
            inputProps={{
              step: 0.01, // Ensures the number input increments/decrements by 0.01
            }}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">$</InputAdornment>
              ),
            }}
            helperText={
              paymentAmount < totalAmount
                ? `Remaining balance: $${(totalAmount - paymentAmount).toFixed(2)}`
                : paymentAmount > totalAmount
                  ? `Change due: $${(paymentAmount - totalAmount).toFixed(2)}`
                  : 'Payment amount matches total'
            }
          />
        </Grid>

        {paymentMethod === 'credit_card' && (
          <>
            <Grid item xs={12}>
              <TextField
                label="Card Number"
                placeholder="**** **** **** ****"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                fullWidth
                required
                inputProps={{
                  maxLength: 19,
                  pattern: '[0-9\\s]{13,19}',
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Expiration Date"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                fullWidth
                required
                inputProps={{
                  maxLength: 5,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="CVV"
                placeholder="***"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                fullWidth
                required
                type="password"
                inputProps={{
                  maxLength: 4,
                }}
              />
            </Grid>
          </>
        )}

        {paymentMethod === 'check' && (
          <Grid item xs={12}>
            <TextField
              label="Check Number"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              fullWidth
              required
            />
          </Grid>
        )}

        {paymentMethod === 'account' && (
          <Grid item xs={12}>
            <FormHelperText>
              The full amount will be charged to the customer's account.
            </FormHelperText>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default PaymentStep;
