import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { customerService } from '../../services/customerService';
import { invoiceService } from '../../services/invoiceService';

interface PaymentProcessingProps {
  onContinue: (paymentData: any) => void;
  amount: number;
  invoiceId?: string; // Add invoiceId prop
  depositRequired?: boolean;
  depositAmount?: number;
  totalAmount?: number;
  initialPayment: {
    method: string;
    amount: number;
    cardDetails?: {
      cardNumber: string;
      expiryDate: string;
      cvv: string;
      cardholderName: string;
    };
  };
}

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  onContinue,
  amount,
  invoiceId,
  depositRequired = false,
  depositAmount = 0,
  totalAmount = 0,
  initialPayment,
}) => {
  // State for payment details
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'skip'>(
    depositRequired ? 'deposit' : 'full'
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(initialPayment.method || 'CASH');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [nameOnCard, setNameOnCard] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  
  // Store credit info
  const [storeCredit, setStoreCredit] = useState<number>(0);
  const [useStoreCredit, setUseStoreCredit] = useState<boolean>(false);
  const [storeCreditToUse, setStoreCreditToUse] = useState<number>(0);
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Load customer store credit from the API if we have an invoice
  useEffect(() => {
    const loadStoreCredit = async () => {
      try {
        if (invoiceId) {
          // Get invoice details first
          const invoice = await invoiceService.getInvoiceById(invoiceId);
          if (invoice?.customerId) {
            // Get customer details and extract store credit
            const customerData = await customerService.getCustomerById(invoice.customerId);
            if (customerData?.storeCredit) {
              setStoreCredit(customerData.storeCredit);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load store credit:', error);
        // Default to 0 if there's an error
        setStoreCredit(0);
      }
    };
    
    loadStoreCredit();
  }, [invoiceId]);
  
  // Handle store credit checkbox change
  const handleStoreCreditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setUseStoreCredit(checked);
    
    if (checked) {
      // Calculate how much store credit to use
      const creditToUse = Math.min(storeCredit, amount);
      setStoreCreditToUse(creditToUse);
    } else {
      setStoreCreditToUse(0);
    }
  };
  
  // Handle store credit amount change
  const handleStoreCreditAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(
      Math.max(0, parseFloat(event.target.value) || 0),
      storeCredit,
      amount
    );
    setStoreCreditToUse(value);
  };
  
  // Calculate remaining amount to pay after applying store credit
  // Round to nearest penny to avoid floating point issues
  const remainingAmount = Math.max(0, Math.round((amount - storeCreditToUse) * 100) / 100);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Handle form submission and payment processing
  const handleSubmitPayment = async () => {
    // Validate inputs based on payment method
    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardNumber || !expiryDate || !cvv || !nameOnCard) {
        setError('Please fill in all credit card details');
        return;
      }
      
      // Simple validation for card number format
      if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
        setError('Card number should be 16 digits');
        return;
      }
      
      // Simple validation for expiry date format (MM/YY)
      if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        setError('Expiry date should be in format MM/YY');
        return;
      }
      
      // Simple validation for CVV
      if (!/^\d{3,4}$/.test(cvv)) {
        setError('CVV should be 3 or 4 digits');
        return;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create paymentData object
      const paymentData: any = {
        invoiceId, // Include the invoiceId in payment data
        amount: Math.round(remainingAmount * 100) / 100, // Ensure amount is rounded to nearest penny
        method: paymentMethod,
        status: 'PAID',
        transactionId: `SIMULATED-${Date.now()}`,
        notes: paymentNotes,
      };
      
      // If using store credit, include it in the payment data
      if (useStoreCredit && storeCreditToUse > 0) {
        paymentData.storeCredit = storeCreditToUse;
      }
      
      // For credit card payments, add card info
      if (paymentMethod === 'CREDIT_CARD') {
        // In a real implementation, this would be sent to a payment processor
        // For simulation, we'll just include the last 4 digits in the notes
        const last4 = cardNumber.replace(/\s/g, '').slice(-4);
        paymentData.notes += ` | Card ending in ${last4}`;
        paymentData.cardLastFour = last4;
      }
      
      // In a real implementation, we would process the payment through the API
      // For this demonstration, we'll simulate a successful response
      
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      
      // Pass payment data back to parent component
      onContinue({
        ...paymentData,
        storeCredit: useStoreCredit ? storeCreditToUse : 0,
        cardDetails: paymentMethod === 'CREDIT_CARD' ? {
          cardNumber,
          expiryDate,
          cvv,
          cardholderName: nameOnCard
        } : undefined
      });
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError(err.response?.data?.message || 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Payment Processing
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Payment processed successfully!
        </Alert>
      )}
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Invoice Total: {formatCurrency(totalAmount || amount)}
            </Typography>
            
            {depositRequired && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary.contrastText" gutterBottom>
                  Deposit Required: {formatCurrency(depositAmount)}
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  Balance Due at Checkout: {formatCurrency((totalAmount || amount) - depositAmount)}
                </Typography>
              </Box>
            )}
          </Grid>
          
          {/* Payment Option Selection */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Payment Option:
            </Typography>
            <FormControl component="fieldset">
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {depositRequired && (
                  <Button
                    variant={paymentOption === 'deposit' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentOption('deposit')}
                    sx={{ minWidth: 150 }}
                  >
                    Pay Deposit ({formatCurrency(depositAmount)})
                  </Button>
                )}
                <Button
                  variant={paymentOption === 'full' ? 'contained' : 'outlined'}
                  onClick={() => setPaymentOption('full')}
                  sx={{ minWidth: 150 }}
                >
                  Pay in Full ({formatCurrency(totalAmount || amount)})
                </Button>
                {!depositRequired && (
                  <Button
                    variant={paymentOption === 'skip' ? 'contained' : 'outlined'}
                    color="secondary"
                    onClick={() => setPaymentOption('skip')}
                    sx={{ minWidth: 150 }}
                  >
                    Skip Payment
                  </Button>
                )}
              </Box>
            </FormControl>
          </Grid>
          
          {paymentOption !== 'skip' && (
            <Grid item xs={12}>
              <Typography variant="h6" color="primary">
                Amount to Pay Now: {formatCurrency(paymentOption === 'deposit' ? depositAmount : (totalAmount || amount))}
              </Typography>
            </Grid>
          )}
          
          {paymentOption === 'skip' && (
            <Grid item xs={12}>
              <Alert severity="info">
                No payment will be processed. The reservation will be created with a pending invoice.
              </Alert>
            </Grid>
          )}
          
          {storeCredit > 0 && (
            <>
              <Grid item xs={12}>
                <Divider />
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle2">
                    Available Store Credit: {formatCurrency(storeCredit)}
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    <FormControl sx={{ width: 200 }}>
                      <TextField
                        label="Apply Store Credit"
                        type="number"
                        value={useStoreCredit ? storeCreditToUse : 0}
                        onChange={handleStoreCreditAmountChange}
                        InputProps={{
                          startAdornment: '$',
                          inputProps: {
                            min: 0,
                            max: Math.min(storeCredit, amount),
                            step: 0.01,
                          },
                        }}
                        disabled={!useStoreCredit}
                        size="small"
                      />
                    </FormControl>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Divider />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Remaining to Pay: {formatCurrency(remainingAmount)}
                </Typography>
              </Grid>
            </>
          )}
          
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel id="payment-method-label">Payment Method</InputLabel>
              <Select
                labelId="payment-method-label"
                id="payment-method"
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="CHECK">Check</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {paymentMethod === 'CREDIT_CARD' && (
            <>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Card Number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  inputProps={{ maxLength: 19 }}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="MM/YY"
                  inputProps={{ maxLength: 5 }}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  inputProps={{ maxLength: 4 }}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name on Card"
                  value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                  size="small"
                />
              </Grid>
            </>
          )}
          
          {(paymentMethod === 'CASH' || paymentMethod === 'CHECK') && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                value={remainingAmount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: {
                    min: 0,
                    step: 0.01,
                  },
                }}
                size="small"
                disabled={true}
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Payment Notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        {paymentOption === 'skip' ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              onContinue({
                method: 'NONE',
                amount: 0,
                status: 'PENDING',
                notes: 'Payment skipped - no deposit required',
              });
            }}
          >
            Complete Reservation
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitPayment}
            disabled={loading || success}
          >
            {loading ? <CircularProgress size={24} /> : `Process Payment (${formatCurrency(paymentOption === 'deposit' ? depositAmount : (totalAmount || amount))})`}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PaymentProcessing;
