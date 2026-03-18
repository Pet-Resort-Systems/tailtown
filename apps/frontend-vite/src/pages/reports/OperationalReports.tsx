/**
 * Operational Reports Component
 * Displays operational analytics and reports
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
  LinearProgress,
} from '@mui/material';
import {
  Business as BusinessIcon,
  GetApp as ExportIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  formatCurrency,
  formatPercentage,
  getOperationalStaffReport,
  getOperationalResourcesReport,
  getOperationalBookingsReport,
  getOperationalCapacityReport,
  exportReportCSV,
} from '../../services/reportService';

type ReportType = 'staff' | 'resources' | 'bookings' | 'capacity';

const OperationalReports: React.FC = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<ReportType>('resources');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (reportType) {
        case 'staff':
          response = await getOperationalStaffReport(startDate, endDate);
          break;
        case 'resources':
          response = await getOperationalResourcesReport(startDate, endDate);
          break;
        case 'bookings':
          response = await getOperationalBookingsReport(startDate, endDate);
          break;
        case 'capacity':
          response = await getOperationalCapacityReport(startDate, endDate);
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
      case 'staff':
        return (
          <>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Staff
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.totalStaff || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary.totalRevenue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Services Completed
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.totalServices || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      case 'resources':
        return (
          <>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Resources
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.totalResources || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Average Utilization
                  </Typography>
                  <Typography variant="h4">
                    {formatPercentage(
                      reportData.summary.averageUtilization || 0
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary.totalRevenue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      case 'bookings':
        return (
          <>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Bookings
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.totalBookings || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Peak Day
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.peakDay || '-'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Daily Bookings
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.avgDailyBookings || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      case 'capacity':
        return (
          <>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Average Capacity
                  </Typography>
                  <Typography variant="h4">
                    {formatPercentage(reportData.summary.averageCapacity || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Peak Capacity
                  </Typography>
                  <Typography variant="h4">
                    {formatPercentage(reportData.summary.peakCapacity || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Periods Analyzed
                  </Typography>
                  <Typography variant="h4">
                    {reportData.summary.periodsAnalyzed || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Quick Access Card */}
      <Card
        sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h6">Daily Check-In/Out Report</Typography>
                <Typography variant="body2">
                  Print today's expected dogs with room numbers and manual time
                  tracking
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate('/reports/daily-check-in-out')}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Open Report
            </Button>
          </Box>
        </CardContent>
      </Card>

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
          <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Operational Reports
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
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <MenuItem value="staff">Staff Performance</MenuItem>
                <MenuItem value="resources">Resource Utilization</MenuItem>
                <MenuItem value="bookings">Booking Patterns</MenuItem>
                <MenuItem value="capacity">Capacity Analysis</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
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

          <Grid item xs={12} sm={3}>
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
            {renderSummaryCards()}
          </Grid>

          {/* Data Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {reportType === 'staff' && (
                      <>
                        <TableCell>Staff Name</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell align="right">Services</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Efficiency</TableCell>
                      </>
                    )}
                    {reportType === 'resources' && (
                      <>
                        <TableCell>Resource Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Utilization</TableCell>
                        <TableCell align="right">Hours Booked</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                      </>
                    )}
                    {reportType === 'bookings' && (
                      <>
                        <TableCell>Date/Period</TableCell>
                        <TableCell align="right">Bookings</TableCell>
                        <TableCell align="right">Peak Time</TableCell>
                        <TableCell align="right">Avg Duration</TableCell>
                      </>
                    )}
                    {reportType === 'capacity' && (
                      <>
                        <TableCell>Date/Period</TableCell>
                        <TableCell align="right">Capacity Used</TableCell>
                        <TableCell align="right">Available</TableCell>
                        <TableCell align="right">Utilization</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.data && reportData.data.length > 0 ? (
                    reportData.data.map((row: any, index: number) => (
                      <TableRow key={index}>
                        {reportType === 'staff' && (
                          <>
                            <TableCell>{row.staffName || '-'}</TableCell>
                            <TableCell>{row.role || '-'}</TableCell>
                            <TableCell align="right">
                              {row.services || 0}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.revenue || 0)}
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <LinearProgress
                                  variant="determinate"
                                  value={row.efficiency || 0}
                                  sx={{
                                    flexGrow: 1,
                                    height: 8,
                                    borderRadius: 1,
                                  }}
                                />
                                <Typography variant="body2">
                                  {formatPercentage(row.efficiency || 0)}
                                </Typography>
                              </Box>
                            </TableCell>
                          </>
                        )}
                        {reportType === 'resources' && (
                          <>
                            <TableCell>{row.resourceName || '-'}</TableCell>
                            <TableCell>{row.resourceType || '-'}</TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <LinearProgress
                                  variant="determinate"
                                  value={row.utilization || 0}
                                  sx={{
                                    flexGrow: 1,
                                    height: 8,
                                    borderRadius: 1,
                                  }}
                                />
                                <Typography variant="body2">
                                  {formatPercentage(row.utilization || 0)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {row.hoursBooked || 0}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.revenue || 0)}
                            </TableCell>
                          </>
                        )}
                        {reportType === 'bookings' && (
                          <>
                            <TableCell>{row.period || '-'}</TableCell>
                            <TableCell align="right">
                              {row.bookings || 0}
                            </TableCell>
                            <TableCell align="right">
                              {row.peakTime || '-'}
                            </TableCell>
                            <TableCell align="right">
                              {row.avgDuration || '-'}
                            </TableCell>
                          </>
                        )}
                        {reportType === 'capacity' && (
                          <>
                            <TableCell>{row.period || '-'}</TableCell>
                            <TableCell align="right">
                              {row.capacityUsed || 0}
                            </TableCell>
                            <TableCell align="right">
                              {row.available || 0}
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <LinearProgress
                                  variant="determinate"
                                  value={row.utilization || 0}
                                  sx={{
                                    flexGrow: 1,
                                    height: 8,
                                    borderRadius: 1,
                                  }}
                                />
                                <Typography variant="body2">
                                  {formatPercentage(row.utilization || 0)}
                                </Typography>
                              </Box>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
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
            Operational Reports
          </Typography>
          <Typography color="textSecondary">
            Select a report type and date range, then click "Generate Report" to
            view operational metrics.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default OperationalReports;
