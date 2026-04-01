/**
 * AccountBalance - View account balance and invoices
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  AccountBalance as BalanceIcon,
  Receipt as ReceiptIcon,
  CheckCircle as PaidIcon,
  Warning as PendingIcon,
  Error as OverdueIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';
import customerAccountService, {
  AccountBalance as AccountBalanceType,
  Invoice,
} from '../../../services/customerAccountService';

const getInvoiceStatusIcon = (
  status: string
): React.ReactElement | undefined => {
  switch (status) {
    case 'PAID':
      return <PaidIcon color="success" fontSize="small" />;
    case 'PENDING':
      return <PendingIcon color="warning" fontSize="small" />;
    case 'OVERDUE':
      return <OverdueIcon color="error" fontSize="small" />;
    default:
      return undefined;
  }
};

const getInvoiceStatusColor = (
  status: string
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'OVERDUE':
      return 'error';
    default:
      return 'default';
  }
};

const AccountBalanceComponent: React.FC = () => {
  const { customer } = useCustomerAuth();
  const [balance, setBalance] = useState<AccountBalanceType | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!customer?.id) return;

    try {
      setLoading(true);
      setError('');
      const [balanceData, invoicesData] = await Promise.all([
        customerAccountService.getAccountBalance(customer.id),
        customerAccountService.getInvoices(customer.id),
      ]);
      setBalance(balanceData);
      setInvoices(invoicesData);
    } catch (err: any) {
      console.error('Error loading account data:', err);
      setError('Unable to load account information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'PENDING' || i.status === 'OVERDUE'
  );
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');

  return (
    <Box>
      {/* Balance Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BalanceIcon sx={{ mr: 1 }} />
                <Typography variant="body2">Current Balance</Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                ${balance?.balance?.toFixed(2) || '0.00'}
              </Typography>
              {balance?.balance && balance.balance > 0 && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Credit on account
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Pending Charges
                </Typography>
              </Box>
              <Typography
                variant="h4"
                fontWeight={700}
                color={
                  balance?.pendingCharges ? 'warning.main' : 'text.primary'
                }
              >
                ${balance?.pendingCharges?.toFixed(2) || '0.00'}
              </Typography>
              {pendingInvoices.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {pendingInvoices.length} invoice
                  {pendingInvoices.length > 1 ? 's' : ''} pending
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Last Payment
                </Typography>
              </Box>
              {balance?.lastPaymentDate ? (
                <>
                  <Typography variant="h4" fontWeight={700}>
                    ${balance.lastPaymentAmount?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(parseISO(balance.lastPaymentDate), 'MMM d, yyyy')}
                  </Typography>
                </>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  No payments yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Outstanding Invoices
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have {pendingInvoices.length} outstanding invoice
            {pendingInvoices.length > 1 ? 's' : ''} totaling $
            {pendingInvoices
              .reduce((sum, inv) => sum + inv.amount, 0)
              .toFixed(2)}
          </Alert>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      {format(parseISO(invoice.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(invoice.dueDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ${invoice.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getInvoiceStatusIcon(invoice.status)}
                        label={invoice.status}
                        color={getInvoiceStatusColor(invoice.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="contained">
                        Pay Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Payment History */}
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Payment History
      </Typography>

      {paidInvoices.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 4 }}>
          <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No payment history yet
          </Typography>
        </Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paidInvoices.slice(0, 10).map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    {format(parseISO(invoice.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    ${invoice.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<PaidIcon />}
                      label="Paid"
                      color="success"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Contact for Questions */}
      <Box
        sx={{
          mt: 4,
          p: 3,
          bgcolor: 'grey.50',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Questions about your account? Contact us at{' '}
          <Typography component="span" color="primary" fontWeight={600}>
            (555) 123-4567
          </Typography>{' '}
          or{' '}
          <Typography component="span" color="primary" fontWeight={600}>
            billing@tailtown.com
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
};

export default AccountBalanceComponent;
