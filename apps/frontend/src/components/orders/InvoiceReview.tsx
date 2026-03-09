import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Divider,
} from '@mui/material';

interface InvoiceReviewProps {
  onContinue: (invoiceData: any) => void;
  orderData: any;
}

const InvoiceReview: React.FC<InvoiceReviewProps> = ({
  onContinue,
  orderData,
}) => {
  // State for editable invoice fields
  const [notes, setNotes] = useState(orderData.invoice.notes);
  const [discount, setDiscount] = useState(orderData.invoice.discount);
  
  // Calculate totals
  const subtotal = orderData.invoice.subtotal;
  const taxRate = orderData.invoice.taxRate;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount - discount;
  
  // Format dates
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Handle discount change
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setDiscount(value);
  };
  
  // Handle continue to next step
  const handleContinue = () => {
    const invoiceData = {
      ...orderData.invoice,
      notes,
      discount,
      taxAmount,
      total,
    };
    
    onContinue(invoiceData);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Invoice
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Customer Information:</Typography>
            <Typography variant="body2">
              {orderData.customer?.firstName} {orderData.customer?.lastName}
            </Typography>
            <Typography variant="body2">
              {orderData.customer?.email}
            </Typography>
            <Typography variant="body2">
              {orderData.customer?.phone || 'No phone provided'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Pet Information:</Typography>
            <Typography variant="body2">
              {orderData.pet?.name} ({orderData.pet?.type})
            </Typography>
            {orderData.pet?.breed && (
              <Typography variant="body2">
                Breed: {orderData.pet.breed}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Reservation Details:</Typography>
            <Typography variant="body2">
              Start: {formatDate(orderData.reservation.startDate)}
            </Typography>
            <Typography variant="body2">
              End: {formatDate(orderData.reservation.endDate)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Invoice Information:</Typography>
            <Typography variant="body2">
              Invoice #: {orderData.invoice.invoiceNumber}
            </Typography>
            <Typography variant="body2">
              Date: {formatDate(new Date())}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Service Details:
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Main service */}
                  <TableRow>
                    <TableCell>Reservation Service</TableCell>
                    <TableCell align="right">1</TableCell>
                    <TableCell align="right">
                      {formatCurrency(subtotal - orderData.addOns.reduce((sum: number, addon: any) => sum + (addon.price * addon.quantity), 0))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(subtotal - orderData.addOns.reduce((sum: number, addon: any) => sum + (addon.price * addon.quantity), 0))}
                    </TableCell>
                  </TableRow>
                  
                  {/* Add-on services */}
                  {orderData.addOns.map((addon: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell align="right">{addon.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(addon.price)}</TableCell>
                      <TableCell align="right">{formatCurrency(addon.price * addon.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 300 }}>
                <Typography variant="subtitle2">Subtotal:</Typography>
                <Typography variant="body1" sx={{ ml: 'auto' }}>
                  {formatCurrency(subtotal)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 300 }}>
                <Typography variant="subtitle2">Tax ({(taxRate * 100).toFixed(1)}%):</Typography>
                <Typography variant="body1" sx={{ ml: 'auto' }}>
                  {formatCurrency(taxAmount)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 300, mb: 1 }}>
                <Typography variant="subtitle2" color={discount > 0 ? "error" : "text.primary"} fontWeight={discount > 0 ? "bold" : "normal"}>
                  Discount:
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  InputProps={{ 
                    startAdornment: '$',
                    sx: { color: discount > 0 ? "error.main" : "inherit" }
                  }}
                  value={discount}
                  onChange={handleDiscountChange}
                  sx={{ 
                    width: 100, 
                    ml: 'auto',
                    '& .MuiOutlinedInput-root': {
                      borderColor: discount > 0 ? "error.main" : "inherit",
                    }
                  }}
                />
              </Box>
              
              {discount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 300, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Discounted subtotal: {formatCurrency(subtotal - discount)}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 300, mt: 1 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" sx={{ ml: 'auto' }}>
                  {formatCurrency(total)}
                </Typography>
              </Box>
              
              {/* Deposit Information */}
              {orderData.invoice.depositRequired && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 300, mt: 2, pt: 2, borderTop: '2px dashed #ccc' }}>
                    <Typography variant="subtitle2" color="primary">Deposit Required:</Typography>
                    <Typography variant="subtitle2" color="primary" sx={{ ml: 'auto' }}>
                      {formatCurrency(orderData.invoice.depositAmount)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', maxWidth: 300 }}>
                    <Typography variant="body2" color="text.secondary">Balance Due at Checkout:</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      {formatCurrency(orderData.invoice.balanceDue)}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Invoice Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
              sx={{ mt: 2 }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleContinue}
        >
          Continue to Payment
        </Button>
      </Box>
    </Box>
  );
};

export default InvoiceReview;
