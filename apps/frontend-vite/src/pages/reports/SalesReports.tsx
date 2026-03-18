/**
 * Sales Reports Component
 * Displays sales analytics and reports
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  GetApp as ExportIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import {
  getSalesDailyReport,
  getSalesMonthlyReport,
  getSalesYTDReport,
  getTopCustomersReport,
  exportReportCSV,
  formatCurrency,
  formatPercentage,
} from '../../services/reportService';

type ReportPeriod =
  | 'daily'
  | 'monthly'
  | 'last-month'
  | 'ytd'
  | 'top-customers';

const SalesReports: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  // Load report when period or date changes
  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadReport();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, selectedDate, selectedYear, selectedMonth]
  );

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (period) {
        case 'daily':
          response = await getSalesDailyReport(selectedDate);
          break;
        case 'monthly':
          response = await getSalesMonthlyReport(selectedYear, selectedMonth);
          break;
        case 'last-month':
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          response = await getSalesMonthlyReport(
            lastMonth.getFullYear(),
            lastMonth.getMonth() + 1
          );
          break;
        case 'ytd':
          response = await getSalesYTDReport(selectedYear);
          break;
        case 'top-customers':
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date(
            new Date().setMonth(new Date().getMonth() - 1)
          )
            .toISOString()
            .split('T')[0];
          response = await getTopCustomersReport(startDate, endDate, 10);
          break;
      }

      // Extract the actual data from the response
      const data = response?.data || response;
      setReportData(data);
    } catch (err: any) {
      console.error('Error loading report:', err);
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reportData) {
      exportReportCSV(reportData);
    }
  };

  return (
    <Box>
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
          <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Sales Reports
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            disabled={!reportData || loading}
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

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Period</InputLabel>
              <Select
                value={period}
                label="Report Period"
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="last-month">Last Month</MenuItem>
                <MenuItem value="ytd">Year-to-Date</MenuItem>
                <MenuItem value="top-customers">Top Customers</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {period === 'daily' && (
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          {(period === 'monthly' || period === 'ytd') && (
            <>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  inputProps={{ min: 2020, max: 2030 }}
                />
              </Grid>
              {period === 'monthly' && (
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={selectedMonth}
                      label="Month"
                      onChange={(e) =>
                        setSelectedMonth(e.target.value as number)
                      }
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleDateString('en-US', {
                            month: 'long',
                          })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </>
          )}

          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={loadReport}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate'}
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
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.totalRevenue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Transactions
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary?.totalTransactions || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Transaction
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(
                      reportData.summary?.averageTransaction || 0
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Service Breakdown */}
          {reportData.data?.serviceBreakdown &&
            reportData.data.serviceBreakdown.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Sales by Service
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Service</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">% of Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.data.serviceBreakdown.map(
                        (service: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{service.serviceName}</TableCell>
                            <TableCell>
                              <Chip label={service.serviceType} size="small" />
                            </TableCell>
                            <TableCell align="right">{service.count}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(service.revenue)}
                            </TableCell>
                            <TableCell align="right">
                              {formatPercentage(service.percentage)}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

          {/* Payment Method Breakdown */}
          {reportData.data?.paymentMethodBreakdown &&
            reportData.data.paymentMethodBreakdown.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Sales by Payment Method
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Payment Method</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">% of Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.data.paymentMethodBreakdown.map(
                        (pm: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{pm.method}</TableCell>
                            <TableCell align="right">{pm.count}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(pm.amount)}
                            </TableCell>
                            <TableCell align="right">
                              {formatPercentage(pm.percentage)}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

          {/* Top Customers */}
          {period === 'top-customers' && Array.isArray(reportData.data) && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Top Customers by Revenue
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Total Spent</TableCell>
                      <TableCell align="right">Transactions</TableCell>
                      <TableCell align="right">Avg Transaction</TableCell>
                      <TableCell>Last Visit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.data.map((customer: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{customer.customerName}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(customer.totalSpent)}
                        </TableCell>
                        <TableCell align="right">
                          {customer.transactionCount}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(customer.averageTransaction)}
                        </TableCell>
                        <TableCell>{customer.lastVisit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default SalesReports;
