import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Grid
} from '@mui/material';
import InvoiceDetailsDialog from '../invoices/InvoiceDetailsDialog';
import { 
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  Add as AddIcon,
  MoneyOff as MoneyOffIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  Invoice, 
  Payment, 
  AccountBalance,
  invoiceService 
} from '../../services/invoiceService';
import { 
  paymentService, 
  StoreCredit, 
  CreditApplication 
} from '../../services/paymentService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface AccountHistoryProps {
  customerId: string;
  onInvoiceCreated?: () => void;
}

const AccountHistory: React.FC<AccountHistoryProps> = ({ customerId, onInvoiceCreated }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null);
  
  // State for modal forms
  const [openNewPaymentModal, setOpenNewPaymentModal] = useState<boolean>(false);
  const [openStoreCreditModal, setOpenStoreCreditModal] = useState<boolean>(false);
  const [openApplyCreditModal, setOpenApplyCreditModal] = useState<boolean>(false);
  const [openInvoiceDetailsDialog, setOpenInvoiceDetailsDialog] = useState<boolean>(false);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<Invoice | null>(null);
  
  // Form states
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CREDIT_CARD');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('');
  const [applyCreditAmount, setApplyCreditAmount] = useState<string>('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch invoices, payments, and account balance in parallel
      const [invoicesData, paymentsData, balanceData] = await Promise.all([
        invoiceService.getCustomerInvoices(customerId),
        paymentService.getCustomerPayments(customerId),
        invoiceService.getCustomerAccountBalance(customerId)
      ]);
      
      setInvoices(invoicesData);
      setPayments(paymentsData);
      setAccountBalance(balanceData);
    } catch (err: any) {
      console.error('Error fetching account data:', err);
      setError(err.message || 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      fetchData();
    }
  }, [customerId, fetchData]);

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
  
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return 'info';
      default:
        return 'default';
    }
  };

  // Handle payment form submission
  const handlePaymentSubmit = async () => {
    try {
      if (!selectedInvoice || !paymentAmount || !paymentMethod) {
        setError('Please fill out all required fields');
        return;
      }

      await paymentService.createPayment({
        invoiceId: selectedInvoice,
        customerId,
        amount: parseFloat(paymentAmount),
        method: paymentMethod as any,
        status: 'PAID',
        notes: paymentNotes
      });

      // Reset form and refresh data
      setOpenNewPaymentModal(false);
      setSelectedInvoice('');
      setPaymentAmount('');
      setPaymentMethod('CREDIT_CARD');
      setPaymentNotes('');
      fetchData();
    } catch (err: any) {
      console.error('Error creating payment:', err);
      setError(err.message || 'Failed to process payment');
    }
  };

  // Handle store credit form submission
  const handleStoreCreditSubmit = async () => {
    try {
      if (!creditAmount) {
        setError('Please enter an amount');
        return;
      }

      const storeCreditData: StoreCredit = {
        customerId,
        amount: parseFloat(creditAmount),
        reason: creditReason
      };

      await paymentService.recordStoreCredit(storeCreditData);

      // Reset form and refresh data
      setOpenStoreCreditModal(false);
      setCreditAmount('');
      setCreditReason('');
      fetchData();
    } catch (err: any) {
      console.error('Error recording store credit:', err);
      setError(err.message || 'Failed to record store credit');
    }
  };

  // Handle apply credit form submission
  const handleApplyCreditSubmit = async () => {
    try {
      if (!selectedInvoice || !applyCreditAmount) {
        setError('Please fill out all required fields');
        return;
      }

      const creditApplicationData: CreditApplication = {
        invoiceId: selectedInvoice,
        customerId,
        amount: parseFloat(applyCreditAmount)
      };

      await paymentService.applyStoreCredit(creditApplicationData);

      // Reset form and refresh data
      setOpenApplyCreditModal(false);
      setSelectedInvoice('');
      setApplyCreditAmount('');
      fetchData();
    } catch (err: any) {
      console.error('Error applying store credit:', err);
      setError(err.message || 'Failed to apply store credit');
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="account history tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<AccountBalanceIcon />} iconPosition="start" label="Account Summary" />
          <Tab icon={<ReceiptIcon />} iconPosition="start" label="Invoices" />
          <Tab icon={<PaymentIcon />} iconPosition="start" label="Payments" />
          <Tab icon={<CreditCardIcon />} iconPosition="start" label="Store Credit" />
        </Tabs>
      </Box>

      {/* Account Summary Tab */}
      <TabPanel value={tabValue} index={0}>
        <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Account Balance
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {accountBalance ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  Total Invoiced:
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {formatCurrency(accountBalance.totalInvoiced)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  Total Paid:
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {formatCurrency(accountBalance.totalPaid)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  Current Balance:
                </Typography>
                <Typography 
                  variant="h6" 
                  color={accountBalance.accountBalance > 0 ? 'error.main' : 'success.main'}
                >
                  {formatCurrency(accountBalance.accountBalance)}
                  {accountBalance.accountBalance > 0 && ' (Due)'}
                  {accountBalance.accountBalance < 0 && ' (Overpaid)'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  Store Credit:
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(accountBalance.storeCredit)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  Net Balance:
                </Typography>
                <Typography 
                  variant="h4" 
                  color={accountBalance.netBalance > 0 ? 'error.main' : 'success.main'}
                  sx={{ mt: 1, fontWeight: 'bold' }}
                >
                  {formatCurrency(accountBalance.netBalance)}
                  {accountBalance.netBalance > 0 && ' (Customer Owes)'}
                  {accountBalance.netBalance < 0 && ' (Store Credit)'}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography>No balance information available</Typography>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<PaymentIcon />} 
              onClick={() => setOpenNewPaymentModal(true)}
              disabled={invoices.length === 0}
            >
              Record Payment
            </Button>
          </Box>
        </Paper>
        
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Store Credit
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="primary.main">
              Available: {accountBalance ? formatCurrency(accountBalance.storeCredit) : '$0.00'}
            </Typography>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={() => setOpenStoreCreditModal(true)}
                sx={{ mr: 1 }}
              >
                Add Credit
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<MoneyOffIcon />} 
                onClick={() => setOpenApplyCreditModal(true)}
                disabled={!accountBalance || accountBalance.storeCredit <= 0 || invoices.length === 0}
              >
                Apply Credit
              </Button>
            </Box>
          </Box>
        </Paper>
      </TabPanel>

      {/* Invoices Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Invoice History</Typography>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((invoice) => {
                  // Calculate remaining balance
                  const paid = invoice.payments?.reduce((sum, payment) => 
                    payment.status === 'PAID' ? sum + payment.amount : sum, 0) || 0;
                  const balance = invoice.total - paid;
                  
                  return (
                    <TableRow 
                      key={invoice.id} 
                      hover 
                      onClick={() => {
                        setSelectedInvoiceDetails(invoice);
                        setOpenInvoiceDetailsDialog(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{format(new Date(invoice.issueDate || new Date()), 'MM/dd/yyyy')}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), 'MM/dd/yyyy')}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{formatCurrency(balance)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={invoice.status} 
                          color={getInvoiceStatusColor(invoice.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">No invoices found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Payments Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Payment History</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />} 
            onClick={() => setOpenNewPaymentModal(true)}
            disabled={invoices.length === 0}
          >
            Record Payment
          </Button>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>{format(new Date(payment.paymentDate || new Date()), 'MM/dd/yyyy')}</TableCell>
                    <TableCell>{payment.invoiceId || '—'}</TableCell>
                    <TableCell>{payment.method.replace('_', ' ')}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.status} 
                        color={getPaymentStatusColor(payment.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{payment.notes || '—'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">No payments found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Store Credit Tab */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 3 }}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Store Credit Balance
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
              {accountBalance ? formatCurrency(accountBalance.storeCredit) : '$0.00'}
            </Typography>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />} 
                onClick={() => setOpenStoreCreditModal(true)}
              >
                Add Credit
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<MoneyOffIcon />} 
                onClick={() => setOpenApplyCreditModal(true)}
                disabled={!accountBalance || accountBalance.storeCredit <= 0 || invoices.length === 0}
              >
                Apply to Invoice
              </Button>
            </Box>
          </Paper>
          
          <Typography variant="h6" sx={{ mb: 2 }}>Store Credit Transactions</Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.filter(p => p.method === 'STORE_CREDIT').length > 0 ? (
                  payments
                    .filter(p => p.method === 'STORE_CREDIT')
                    .map((credit) => (
                      <TableRow key={credit.id} hover>
                        <TableCell>{format(new Date(credit.paymentDate || new Date()), 'MM/dd/yyyy')}</TableCell>
                        <TableCell>{credit.amount > 0 ? 'Credit Added' : 'Credit Used'}</TableCell>
                        <TableCell>{formatCurrency(Math.abs(credit.amount))}</TableCell>
                        <TableCell>{credit.notes || '—'}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No store credit transactions found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Payment Modal */}
      <Dialog open={openNewPaymentModal} onClose={() => setOpenNewPaymentModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Invoice"
              value={selectedInvoice}
              onChange={(e) => setSelectedInvoice(e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            >
              {invoices
                .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
                .map((invoice) => (
                  <MenuItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {formatCurrency(invoice.total)}
                  </MenuItem>
                ))}
            </TextField>
            
            <TextField
              label="Amount"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            />
            
            <TextField
              select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            >
              <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
              <MenuItem value="DEBIT_CARD">Debit Card</MenuItem>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="CHECK">Check</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              <MenuItem value="GIFT_CARD">Gift Card</MenuItem>
            </TextField>
            
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewPaymentModal(false)}>Cancel</Button>
          <Button onClick={handlePaymentSubmit} variant="contained" color="primary">
            Save Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Store Credit Modal */}
      <Dialog open={openStoreCreditModal} onClose={() => setOpenStoreCreditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Store Credit</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Amount"
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            />
            
            <TextField
              label="Reason"
              multiline
              rows={2}
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
              placeholder="e.g., Refund for canceled service, Compensation for issue, etc."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStoreCreditModal(false)}>Cancel</Button>
          <Button onClick={handleStoreCreditSubmit} variant="contained" color="primary">
            Add Credit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Apply Credit Modal */}
      <Dialog open={openApplyCreditModal} onClose={() => setOpenApplyCreditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Store Credit</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1" gutterBottom>
              Available Credit: {accountBalance ? formatCurrency(accountBalance.storeCredit) : '$0.00'}
            </Typography>
            
            <TextField
              select
              label="Invoice"
              value={selectedInvoice}
              onChange={(e) => setSelectedInvoice(e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
            >
              {invoices
                .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
                .map((invoice) => (
                  <MenuItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {formatCurrency(invoice.total)}
                  </MenuItem>
                ))}
            </TextField>
            
            <TextField
              label="Amount to Apply"
              type="number"
              value={applyCreditAmount}
              onChange={(e) => setApplyCreditAmount(e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="small"
              InputLabelProps={{
                shrink: true
              }}
              inputProps={{
                max: accountBalance?.storeCredit || 0
              }}
              helperText={`Maximum amount: ${accountBalance ? formatCurrency(accountBalance.storeCredit) : '$0.00'}`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApplyCreditModal(false)}>Cancel</Button>
          <Button onClick={handleApplyCreditSubmit} variant="contained" color="primary">
            Apply Credit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Details Dialog */}
      <InvoiceDetailsDialog
        open={openInvoiceDetailsDialog}
        onClose={() => setOpenInvoiceDetailsDialog(false)}
        invoice={selectedInvoiceDetails}
      />
    </Box>
  );
};

export default AccountHistory;
