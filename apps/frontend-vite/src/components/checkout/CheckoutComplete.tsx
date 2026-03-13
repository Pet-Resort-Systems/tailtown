import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

interface CheckoutCompleteProps {
  checkoutData: any;
  onComplete: () => void;
}

const CheckoutComplete: React.FC<CheckoutCompleteProps> = ({
  checkoutData,
  onComplete,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleEmailReceipt = () => {
    // TODO: Implement email receipt functionality
    alert('Email receipt functionality coming soon!');
  };

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Checkout Complete!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The reservation has been successfully checked out
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Checkout Summary
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Reservation ID:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" align="right">
              {checkoutData.reservationId}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Invoice Number:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" align="right">
              {checkoutData.invoice?.invoiceNumber || 'N/A'}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Checkout Time:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" align="right">
              {formatDateTime(new Date().toISOString())}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Total Charges:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" align="right">
              {formatCurrency(checkoutData.invoice?.total || 0)}
            </Typography>
          </Grid>

          {checkoutData.invoice?.depositPaid > 0 && (
            <>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Deposit Paid:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right" color="success.main">
                  {formatCurrency(checkoutData.invoice.depositPaid)}
                </Typography>
              </Grid>
            </>
          )}

          {checkoutData.finalPayment && checkoutData.finalPayment.amount > 0 && (
            <>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Final Payment:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right" color="success.main">
                  {formatCurrency(checkoutData.finalPayment.amount)}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Payment Method:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right">
                  {checkoutData.finalPayment.method}
                </Typography>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12}>
            <Alert severity="success" icon={<CheckCircleIcon />}>
              <Typography variant="body2">
                <strong>Items Returned:</strong>
              </Typography>
              <Typography variant="body2">
                ✓ All belongings returned ({checkoutData.belongings?.length || 0} items)
              </Typography>
              <Typography variant="body2">
                ✓ All medications returned ({checkoutData.medications?.length || 0} items)
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrintReceipt}
        >
          Print Receipt
        </Button>
        <Button
          variant="outlined"
          startIcon={<EmailIcon />}
          onClick={handleEmailReceipt}
        >
          Email Receipt
        </Button>
        <Button
          variant="contained"
          onClick={onComplete}
        >
          Back to Reservation
        </Button>
      </Box>
    </Box>
  );
};

export default CheckoutComplete;
