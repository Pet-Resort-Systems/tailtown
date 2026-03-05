/**
 * Tax Reports Component
 * Displays tax reports for compliance
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
  Chip
} from '@mui/material';
import {
  Receipt as TaxIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import {
  getTaxMonthlyReport,
  getTaxQuarterlyReport,
  getTaxAnnualReport,
  exportReportCSV,
  formatCurrency,
  formatPercentage
} from '../../services/reportService';

type TaxPeriod = 'monthly' | 'quarterly' | 'annual';

const TaxReports: React.FC = () => {
  const [period, setPeriod] = useState<TaxPeriod>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadReport();
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [period, selectedYear, selectedMonth, selectedQuarter]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      switch (period) {
        case 'monthly':
          response = await getTaxMonthlyReport(selectedYear, selectedMonth);
          break;
        case 'quarterly':
          response = await getTaxQuarterlyReport(selectedYear, selectedQuarter);
          break;
        case 'annual':
          response = await getTaxAnnualReport(selectedYear);
          break;
      }
      
      // Extract the actual data from the response
      const data = response?.data || response;
      setReportData(data);
    } catch (err: any) {
      console.error('Error loading tax report:', err);
      setError(err.response?.data?.message || 'Failed to load tax report');
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          <TaxIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Tax Reports
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ExportIcon />}
          onClick={handleExport}
          disabled={!reportData || loading}
        >
          Export CSV
        </Button>
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
                onChange={(e) => setPeriod(e.target.value as TaxPeriod)}
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
              </Select>
            </FormControl>
          </Grid>

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
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Month</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Month"
                  onChange={(e) => setSelectedMonth(e.target.value as number)}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {period === 'quarterly' && (
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Quarter</InputLabel>
                <Select
                  value={selectedQuarter}
                  label="Quarter"
                  onChange={(e) => setSelectedQuarter(e.target.value as number)}
                >
                  <MenuItem value={1}>Q1</MenuItem>
                  <MenuItem value={2}>Q2</MenuItem>
                  <MenuItem value={3}>Q3</MenuItem>
                  <MenuItem value={4}>Q4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(
                      (reportData.summary?.taxableRevenue || 0) + 
                      (reportData.summary?.nonTaxableRevenue || 0)
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Taxable Revenue
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(reportData.summary?.taxableRevenue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tax Collected
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatCurrency(reportData.summary?.taxCollected || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tax Rate
                  </Typography>
                  <Typography variant="h5">
                    {formatPercentage(reportData.summary?.taxRate || reportData.summary?.averageTaxRate || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tax Breakdown */}
          {reportData.data?.breakdown && reportData.data.breakdown.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tax Breakdown by Category
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Taxable Amount</TableCell>
                      <TableCell align="right">Non-Taxable Amount</TableCell>
                      <TableCell align="right">Tax Amount</TableCell>
                      <TableCell align="right">Tax Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.data.breakdown.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={item.category} size="small" />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(item.taxableAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.nonTaxableAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.taxAmount)}</TableCell>
                        <TableCell align="right">{formatPercentage(item.taxRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Monthly Breakdown (for quarterly/annual) */}
          {reportData.data?.monthlyBreakdown && reportData.data.monthlyBreakdown.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Monthly Breakdown
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Total Revenue</TableCell>
                      <TableCell align="right">Taxable Revenue</TableCell>
                      <TableCell align="right">Tax Collected</TableCell>
                      <TableCell align="right">Tax Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.data.monthlyBreakdown.map((month: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{month.monthName}</TableCell>
                        <TableCell align="right">{formatCurrency(month.totalRevenue)}</TableCell>
                        <TableCell align="right">{formatCurrency(month.taxableRevenue)}</TableCell>
                        <TableCell align="right">{formatCurrency(month.taxCollected)}</TableCell>
                        <TableCell align="right">{formatPercentage(month.taxRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Quarterly Breakdown (for annual) */}
          {reportData.data?.quarterlyBreakdown && reportData.data.quarterlyBreakdown.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quarterly Breakdown
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Quarter</TableCell>
                      <TableCell align="right">Total Revenue</TableCell>
                      <TableCell align="right">Taxable Revenue</TableCell>
                      <TableCell align="right">Tax Collected</TableCell>
                      <TableCell align="right">Avg Tax Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.data.quarterlyBreakdown.map((quarter: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{quarter.quarterName}</TableCell>
                        <TableCell align="right">{formatCurrency(quarter.totalRevenue)}</TableCell>
                        <TableCell align="right">{formatCurrency(quarter.taxableRevenue)}</TableCell>
                        <TableCell align="right">{formatCurrency(quarter.taxCollected)}</TableCell>
                        <TableCell align="right">{formatPercentage(quarter.averageTaxRate)}</TableCell>
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

export default TaxReports;
