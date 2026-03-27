/**
 * Customer Reports Component
 * Displays customer analytics and reports
 */

import React, { useState } from 'react';
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
  People as PeopleIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import {
  formatCurrency,
  formatPercentage,
  getCustomerAcquisitionReport,
  getCustomerRetentionReport,
  getCustomerLifetimeValueReport,
  getCustomerDemographicsReport,
  getCustomerInactiveReport,
  exportReportCSV,
} from '../../services/reportService';

type ReportType =
  | 'acquisition'
  | 'retention'
  | 'lifetime-value'
  | 'demographics'
  | 'inactive';

const CustomerReports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('lifetime-value');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [inactiveDays, setInactiveDays] = useState(90);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (reportType) {
        case 'acquisition':
          response = await getCustomerAcquisitionReport(startDate, endDate);
          break;
        case 'retention':
          response = await getCustomerRetentionReport(startDate, endDate);
          break;
        case 'lifetime-value':
          response = await getCustomerLifetimeValueReport(limit);
          break;
        case 'demographics':
          response = await getCustomerDemographicsReport();
          break;
        case 'inactive':
          response = await getCustomerInactiveReport(inactiveDays);
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

  const renderSummaryCards = () => {
    if (!reportData?.summary) return null;

    switch (reportType) {
      case 'acquisition':
        return (
          <>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    New Customers
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.newCustomers || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Customers
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.totalCustomers || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Growth Rate
                  </Typography>
                  <Typography variant="h4">
                    {formatPercentage(reportData.summary.growthRate || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      case 'retention':
        return (
          <>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Retention Rate
                  </Typography>
                  <Typography variant="h4">
                    {formatPercentage(reportData.summary.retentionRate || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Returning Customers
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.returningCustomers || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Churn Rate
                  </Typography>
                  <Typography variant="h4">
                    {formatPercentage(reportData.summary.churnRate || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      case 'lifetime-value':
        return (
          <>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Average LTV
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(
                      reportData.summary.averageLifetimeValue || 0
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total LTV
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary.totalLifetimeValue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Top Customers
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.totalCustomers || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      case 'inactive':
        return (
          <>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Inactive Customers
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.inactiveCount || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Days Threshold
                  </Typography>
                  <Typography variant="h4">{inactiveDays}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Potential Revenue at Risk
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary.potentialRevenue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      default:
        return (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography color="textSecondary">
                  Select a report type to view summary
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
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
          <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Customer Reports
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
          <Grid
            size={{
              xs: 12,
              sm: 3
            }}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <MenuItem value="acquisition">Customer Acquisition</MenuItem>
                <MenuItem value="retention">Retention Rate</MenuItem>
                <MenuItem value="lifetime-value">Lifetime Value</MenuItem>
                <MenuItem value="demographics">Demographics</MenuItem>
                <MenuItem value="inactive">Inactive Customers</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {(reportType === 'acquisition' || reportType === 'retention') && (
            <>
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}

          {reportType === 'lifetime-value' && (
            <Grid
              size={{
                xs: 12,
                sm: 3
              }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Top Customers"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          {reportType === 'inactive' && (
            <Grid
              size={{
                xs: 12,
                sm: 3
              }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Inactive Days"
                value={inactiveDays}
                onChange={(e) => setInactiveDays(parseInt(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          <Grid
            size={{
              xs: 12,
              sm: 3
            }}>
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
            {renderSummaryCards()}
          </Grid>

          {/* Data Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer Name</TableCell>
                    {reportType === 'lifetime-value' ? (
                      <TableCell>Pets</TableCell>
                    ) : (
                      <TableCell>Email</TableCell>
                    )}
                    {reportType === 'lifetime-value' && (
                      <>
                        <TableCell align="right">Total Spent</TableCell>
                        <TableCell align="right">Visits</TableCell>
                        <TableCell align="right">Avg Transaction</TableCell>
                      </>
                    )}
                    {reportType === 'inactive' && (
                      <>
                        <TableCell align="right">Last Visit</TableCell>
                        <TableCell align="right">Days Inactive</TableCell>
                        <TableCell align="right">Total Spent</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.data && reportData.data.length > 0 ? (
                    reportData.data.map((row: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{row.customerName || '-'}</TableCell>
                        {reportType === 'lifetime-value' ? (
                          <TableCell>{row.petNames || '-'}</TableCell>
                        ) : (
                          <TableCell>{row.email || '-'}</TableCell>
                        )}
                        {reportType === 'lifetime-value' && (
                          <>
                            <TableCell align="right">
                              {formatCurrency(row.totalSpent || 0)}
                            </TableCell>
                            <TableCell align="right">
                              {row.totalVisits || 0}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.averageTransaction || 0)}
                            </TableCell>
                          </>
                        )}
                        {reportType === 'inactive' && (
                          <>
                            <TableCell align="right">
                              {row.lastVisit || '-'}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${row.daysInactive || 0} days`}
                                color={
                                  row.daysInactive > 180 ? 'error' : 'warning'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.totalSpent || 0)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="textSecondary">
                          No data available for the selected period
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
          <Typography variant="h6" gutterBottom>
            Customer Reports
          </Typography>
          <Typography color="textSecondary">
            Select a report type and parameters, then click "Generate Report" to
            view customer analytics.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default CustomerReports;
