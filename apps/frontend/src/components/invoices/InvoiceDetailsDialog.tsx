import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Divider,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import { format } from 'date-fns';
import { Invoice } from '../../services/invoiceService';
import { reservationService, Reservation } from '../../services/reservationService';

// Extended invoice interface with reservation details
interface ExtendedInvoice extends Invoice {
  reservation?: {
    service?: {
      name: string;
      id?: string;
    };
    pet?: {
      name: string;
    };
    startDate?: string;
    endDate?: string;
    price?: number;
    serviceId?: string;
  };
}

interface InvoiceDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: ExtendedInvoice | null;
}

const InvoiceDetailsDialog: React.FC<InvoiceDetailsDialogProps> = ({ open, onClose, invoice }) => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch reservation details when the invoice is opened
  useEffect(() => {
    // Reset state when invoice changes
    setReservation(null);
    setError(null);
    
    if (invoice && invoice.reservationId && open) {
      const fetchReservation = async () => {
        try {
          setLoading(true);
          // We already checked that reservationId exists in the if condition above,
          // but we need to reassure TypeScript that it's not undefined
          const reservationId = invoice.reservationId as string;
          const reservationData = await reservationService.getReservationById(reservationId);
          setReservation(reservationData);
        } catch (err: any) {
          console.error('Error fetching reservation:', err);
          setError('Failed to load reservation details');
        } finally {
          setLoading(false);
        }
      };
      
      fetchReservation();
    } else {
      setLoading(false);
    }
  }, [invoice, open]);
  
  // Early return after hooks are called
  if (!invoice) return null;
  
  // Debug data
  
  // Get service name from reservation if available
  const serviceName = reservation?.service?.name || 
    (invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems[0].description : 'Service');

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get status color helper
  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'OVERDUE':
        return 'error';
      case 'DRAFT':
        return 'default';
      case 'SENT':
        return 'primary';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  // Calculate remaining balance
  const paid = invoice.payments?.reduce((sum, payment) => 
    payment.status === 'PAID' ? sum + payment.amount : sum, 0) || 0;
  const balance = invoice.total - paid;
  
  // Render table rows as an array to avoid DOM nesting issues
  const renderTableRows = () => {
    const rows = [];
    
    // We'll handle line items differently since reservation data is not available
    // Skip adding a main service row here as we'll show all line items below
    
    // Display all line items, including the main service
    if (invoice.lineItems && invoice.lineItems.length > 0) {
      invoice.lineItems.forEach((item, index) => {
        // For the first line item, which is likely the main service, enhance the description if needed
        let description = item.description;
        
        // If this is the first item and it's a generic service description, try to get a better name
        if (index === 0 && (item.description === 'Service' || item.description === 'Reservation Service')) {
          // First priority: use service name from reservation if available
          if (reservation && reservation.service && reservation.service.name) {
            description = reservation.service.name;
          } 
          // Second priority: use serviceId from reservation if available
          else if (reservation && reservation.serviceId) {
            // Try to make the serviceId more readable
            const serviceIdParts = reservation.serviceId.split('-');
            if (serviceIdParts.length > 0) {
              description = serviceIdParts
                .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
            }
          }
          // Otherwise use the original description
        }
          
        rows.push(
          <TableRow key={`item-${index}`}>
            <TableCell>{description}</TableCell>
            <TableCell align="right">{item.quantity}</TableCell>
            <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
            <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
          </TableRow>
        );
      });
    } else {
      // Fallback if no line items are available
      rows.push(
        <TableRow key="no-items">
          <TableCell colSpan={4} align="center">No line items available</TableCell>
        </TableRow>
      );
    }
    
    // Subtotal row
    rows.push(
      <TableRow key="subtotal">
        <TableCell colSpan={3} align="right"><strong>Subtotal</strong></TableCell>
        <TableCell align="right">{formatCurrency(invoice.subtotal)}</TableCell>
      </TableRow>
    );
    
    // Discount row (always show, but conditionally format)
    rows.push(
      <TableRow key="discount">
        <TableCell colSpan={3} align="right">
          <Typography variant="subtitle2" color={invoice.discount && invoice.discount > 0 ? "error" : "text.secondary"}>
            Discount
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography color={invoice.discount && invoice.discount > 0 ? "error" : "text.secondary"}>
            {invoice.discount && invoice.discount > 0 ? `-${formatCurrency(invoice.discount)}` : formatCurrency(0)}
          </Typography>
        </TableCell>
      </TableRow>
    );
    
    // Tax row
    rows.push(
      <TableRow key="tax">
        <TableCell colSpan={3} align="right">Tax ({(invoice.taxRate ? invoice.taxRate * 100 : 0).toFixed(2)}%)</TableCell>
        <TableCell align="right">{formatCurrency(invoice.taxAmount || 0)}</TableCell>
      </TableRow>
    );
    
    // Total row
    rows.push(
      <TableRow key="total">
        <TableCell colSpan={3} align="right"><strong>Total</strong></TableCell>
        <TableCell align="right"><strong>{formatCurrency(invoice.total)}</strong></TableCell>
      </TableRow>
    );
    
    // Paid row (if applicable)
    if (paid > 0) {
      rows.push(
        <TableRow key="paid">
          <TableCell colSpan={3} align="right">Paid</TableCell>
          <TableCell align="right">-{formatCurrency(paid)}</TableCell>
        </TableRow>
      );
    }
    
    // Balance due row
    rows.push(
      <TableRow key="balance">
        <TableCell colSpan={3} align="right"><strong>Balance Due</strong></TableCell>
        <TableCell align="right"><strong>{formatCurrency(balance)}</strong></TableCell>
      </TableRow>
    );
    
    return rows;
  };
  
  // Render payment rows as an array to avoid DOM nesting issues
  const renderPaymentRows = () => {
    if (!invoice.payments || invoice.payments.length === 0) {
      return [
        <TableRow key="no-payments">
          <TableCell colSpan={4} align="center">No payment records found</TableCell>
        </TableRow>
      ];
    }
    
    return invoice.payments.map((payment, index) => (
      <TableRow key={`payment-${index}`}>
        <TableCell>
          {payment.paymentDate ? format(new Date(payment.paymentDate), 'MM/dd/yyyy') : 'N/A'}
        </TableCell>
        <TableCell>{payment.method}</TableCell>
        <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
        <TableCell>
          <Chip 
            label={payment.status} 
            color={payment.status === 'PAID' ? 'success' : 'default'}
            size="small"
          />
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* Use Box instead of DialogTitle to avoid DOM nesting issues */}
      <Box sx={{ px: 3, pt: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <div>
            <Typography variant="h6">Invoice {invoice.invoiceNumber}</Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Issued: {format(new Date(invoice.issueDate || new Date()), 'MMMM d, yyyy')}
            </Typography>
          </div>
          <Chip 
            label={invoice.status} 
            color={getInvoiceStatusColor(invoice.status) as any}
            size="small"
          />
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading reservation details...</Typography>
          </Box>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Box>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">Invoice Date</Typography>
            <Typography variant="body1">
              {format(new Date(invoice.issueDate || new Date()), 'MM/dd/yyyy')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">Due Date</Typography>
            <Typography variant="body1">
              {format(new Date(invoice.dueDate), 'MM/dd/yyyy')}
            </Typography>
          </Grid>

          {invoice.reservation && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" gutterBottom>Reservation Details</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Service</Typography>
                <Typography variant="body1">
                  {invoice.reservation.service?.name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Pet</Typography>
                <Typography variant="body1">
                  {invoice.reservation.pet?.name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Start Date</Typography>
                <Typography variant="body1">
                  {invoice.reservation.startDate ? format(new Date(invoice.reservation.startDate), 'MM/dd/yyyy') : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">End Date</Typography>
                <Typography variant="body1">
                  {invoice.reservation.endDate ? format(new Date(invoice.reservation.endDate), 'MM/dd/yyyy') : 'N/A'}
                </Typography>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Line Items</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {renderTableRows()}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          {invoice.notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">Notes</Typography>
              <Typography variant="body2">{invoice.notes}</Typography>
            </Grid>
          )}
          
          {invoice.payments && invoice.payments.length > 0 && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" gutterBottom>Payment History</Typography>
              </Grid>
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {renderPaymentRows()}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {/* Add additional actions like print or email here */}
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDetailsDialog;
