/**
 * End-of-Day Reconciliation Report
 * Shows daily payment summary for cash drawer reconciliation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  PointOfSale as POSIcon,
  Print as PrintIcon,
  GetApp as ExportIcon,
  AttachMoney as CashIcon,
  CreditCard as CardIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import {
  formatCurrency,
  getReconciliationReport,
  exportReportCSV,
} from '../../services/reportService';

const ReconciliationReport: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getReconciliationReport(date);
      setReportData(response?.data || response);
    } catch (err: any) {
      console.error('Error loading reconciliation report:', err);
      setError(
        err.response?.data?.message || 'Failed to load reconciliation report'
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = () => {
    if (reportData) {
      exportReportCSV({
        ...reportData,
        reportType: 'reconciliation',
        data: reportData.transactions || [],
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH':
        return 'success';
      case 'CARD':
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Box className="reconciliation-report">
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5">
          <POSIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          End-of-Day Reconciliation
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={!reportData || loading}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            disabled={!reportData || loading}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Date Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Report Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={loadReport}
              disabled={loading}
            >
              Generate Report
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Report Data */}
      {!loading && reportData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CashIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">Cash Sales</Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.cashSales || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CardIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">Card Sales</Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.cardSales || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary">
                    Tips Collected
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.tipsCollected || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography variant="subtitle2">Refunds Issued</Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.refundsIssued || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Totals Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Daily Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <strong>Total Sales</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>
                          {formatCurrency(reportData.summary?.totalSales || 0)}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>+ Tips Collected</TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.summary?.tipsCollected || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>- Refunds Issued</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        (
                        {formatCurrency(reportData.summary?.refundsIssued || 0)}
                        )
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell>
                        <strong>Net Revenue</strong>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" color="primary">
                          {formatCurrency(reportData.summary?.netRevenue || 0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Cash Drawer Reconciliation
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Opening Balance</TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.openingBalance || 200)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>+ Cash Sales</TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.summary?.cashSales || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'success.light' }}>
                      <TableCell>
                        <strong>Expected Drawer</strong>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6">
                          {formatCurrency(reportData.expectedDrawer || 0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          </Paper>

          {/* Payment Method Breakdown */}
          {reportData.paymentBreakdown &&
            reportData.paymentBreakdown.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Payment Method Breakdown
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Method</TableCell>
                      <TableCell align="center">Transactions</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.paymentBreakdown.map(
                      (item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip
                              label={item.method}
                              color={getPaymentMethodColor(item.method) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{item.count}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </Paper>
            )}

          {/* Transaction List */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Transaction Details ({reportData.summary?.transactionCount || 0}{' '}
              transactions)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Tip</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.transactions &&
                  reportData.transactions.length > 0 ? (
                    reportData.transactions.map((tx: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(tx.time).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>{tx.invoiceNumber}</TableCell>
                        <TableCell>{tx.customerName}</TableCell>
                        <TableCell>
                          <Chip
                            label={tx.paymentMethod}
                            color={
                              getPaymentMethodColor(tx.paymentMethod) as any
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell align="right">
                          {tx.tip > 0 ? formatCurrency(tx.tip) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrency(tx.total)}</strong>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary" sx={{ py: 3 }}>
                          No transactions for this date
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Instructions */}
      {!loading && !reportData && !error && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <POSIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            End-of-Day Reconciliation
          </Typography>
          <Typography color="textSecondary">
            Select a date and click "Generate Report" to view daily payment
            summary and reconciliation data.
          </Typography>
        </Paper>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .reconciliation-report {
            padding: 20px;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </Box>
  );
};

export default ReconciliationReport;
