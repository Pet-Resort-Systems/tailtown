/**
 * Tip Reports Component
 * Displays tip analytics for groomers and general tip pool
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
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Favorite as TipIcon,
  GetApp as ExportIcon,
  ContentCut as GroomerIcon,
  Groups as TeamIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import tipService, {
  GeneralTipPoolSummary,
  AllGroomersSummary,
} from '../../services/tipService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const TipReports: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
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

  // Report data
  const [allGroomersSummary, setAllGroomersSummary] =
    useState<AllGroomersSummary | null>(null);
  const [generalPoolSummary, setGeneralPoolSummary] =
    useState<GeneralTipPoolSummary | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const [groomersData, poolData] = await Promise.all([
        tipService.getAllGroomersTipsSummary({ startDate, endDate }),
        tipService.getGeneralTipPoolSummary({ startDate, endDate }),
      ]);

      setAllGroomersSummary(groomersData);
      setGeneralPoolSummary(poolData);
    } catch (err: any) {
      console.error('Error loading tip reports:', err);
      setError(err.response?.data?.message || 'Failed to load tip reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCSV = () => {
    if (!allGroomersSummary) return;

    const rows = [
      ['Groomer', 'Total Tips', 'Tip Count'],
      ...allGroomersSummary.groomers.map((g) => [
        `${g.groomer.firstName} ${g.groomer.lastName}`,
        g.totalTips.toFixed(2),
        g.tipCount.toString(),
      ]),
      ['', '', ''],
      [
        'Grand Total',
        allGroomersSummary.totals.grandTotal.toFixed(2),
        allGroomersSummary.totals.totalTipCount.toString(),
      ],
    ];

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tip-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalGroomerTips = allGroomersSummary?.totals.grandTotal || 0;
  const totalGeneralTips = generalPoolSummary?.summary.totalAmount || 0;
  const grandTotal = totalGroomerTips + totalGeneralTips;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h5">
          <TipIcon
            sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }}
          />
          Tip Reports
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ExportIcon />}
          onClick={handleExportCSV}
          disabled={!allGroomersSummary}
        >
          Export CSV
        </Button>
      </Box>
      {/* Date Range Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid
            size={{
              xs: 12,
              sm: 4
            }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 4
            }}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 4
            }}>
            <Button
              variant="contained"
              onClick={loadReports}
              disabled={loading}
              fullWidth
              sx={{ height: 56 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
          <Card
            sx={{
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.200',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <GroomerIcon />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Groomer Tips
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {formatCurrency(totalGroomerTips)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {allGroomersSummary?.totals.totalTipCount || 0} tips
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
          <Card
            sx={{
              bgcolor: 'secondary.50',
              border: '1px solid',
              borderColor: 'secondary.200',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <TeamIcon />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  General Tip Pool
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="secondary.main">
                {formatCurrency(totalGeneralTips)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {generalPoolSummary?.summary.tipCount || 0} tips
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
          <Card
            sx={{
              bgcolor: 'success.50',
              border: '1px solid',
              borderColor: 'success.200',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Tips
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {formatCurrency(grandTotal)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All tips combined
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab
            label="Groomer Tips"
            icon={<GroomerIcon />}
            iconPosition="start"
          />
          <Tab label="General Pool" icon={<TeamIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Groomer Tips Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : allGroomersSummary && allGroomersSummary.groomers.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Groomer</TableCell>
                    <TableCell align="right">Total Tips</TableCell>
                    <TableCell align="right">Tip Count</TableCell>
                    <TableCell align="right">Average Tip</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allGroomersSummary.groomers.map((groomer) => (
                    <TableRow key={groomer.groomer.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              mr: 2,
                              bgcolor: 'primary.main',
                              width: 32,
                              height: 32,
                            }}
                          >
                            {groomer.groomer.firstName[0]}
                          </Avatar>
                          {groomer.groomer.firstName} {groomer.groomer.lastName}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} color="success.main">
                          {formatCurrency(groomer.totalTips)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{groomer.tipCount}</TableCell>
                      <TableCell align="right">
                        {groomer.tipCount > 0
                          ? formatCurrency(groomer.totalTips / groomer.tipCount)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>
                      <Typography fontWeight={700}>Total</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700} color="success.main">
                        {formatCurrency(allGroomersSummary.totals.grandTotal)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700}>
                        {allGroomersSummary.totals.totalTipCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700}>
                        {allGroomersSummary.totals.totalTipCount > 0
                          ? formatCurrency(
                              allGroomersSummary.totals.grandTotal /
                                allGroomersSummary.totals.totalTipCount
                            )
                          : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              No groomer tips found for this date range.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* General Pool Summary */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : generalPoolSummary ? (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Pool
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {formatCurrency(generalPoolSummary.summary.totalAmount)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Number of Tips
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {generalPoolSummary.summary.tipCount}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 4
                  }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Average Tip
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {formatCurrency(generalPoolSummary.summary.averageTip)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Collection Method Breakdown */}
              <Typography variant="h6" gutterBottom>
                By Collection Method
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {Object.entries(
                  generalPoolSummary.summary.byCollectionMethod
                ).map(([method, data]) => (
                  <Grid
                    key={method}
                    size={{
                      xs: 12,
                      sm: 4
                    }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Chip
                          label={method}
                          size="small"
                          color={
                            method === 'ONLINE'
                              ? 'primary'
                              : method === 'TERMINAL'
                                ? 'secondary'
                                : 'default'
                          }
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="h6">
                          {formatCurrency(data.total)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {data.count} tips
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Recent Tips */}
              {generalPoolSummary.tips.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Recent Tips
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {generalPoolSummary.tips.slice(0, 10).map((tip) => (
                          <TableRow key={tip.id} hover>
                            <TableCell>
                              {new Date(tip.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {tip.customer
                                ? `${tip.customer.firstName} ${tip.customer.lastName}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={tip.collectionMethod}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} color="success.main">
                                {formatCurrency(Number(tip.amount))}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              No general tips found for this date range.
            </Alert>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default TipReports;
