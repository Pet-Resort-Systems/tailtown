import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  EventNote as ReservationIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsService, PlatformMetrics } from '../services/analyticsService';

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [planDist, setPlanDist] = useState<any[]>([]);
  const [topByCustomers, setTopByCustomers] = useState<any[]>([]);
  const [topByReservations, setTopByReservations] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [metricsData, growthData, statusData, planData, topCustomers, topReservations] =
        await Promise.all([
          analyticsService.getPlatformMetrics(),
          analyticsService.getTenantGrowth(),
          analyticsService.getStatusDistribution(),
          analyticsService.getPlanDistribution(),
          analyticsService.getTopTenantsByCustomers(5),
          analyticsService.getTopTenantsByReservations(5),
        ]);

      setMetrics(metricsData);
      setGrowth(growthData);
      setStatusDist(statusData);
      setPlanDist(planData);
      setTopByCustomers(topCustomers);
      setTopByReservations(topReservations);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Platform Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Real-time insights into platform performance and tenant activity
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Tenants
                  </Typography>
                  <Typography variant="h4">{metrics?.totalTenants || 0}</Typography>
                  <Typography variant="caption" color="success.main">
                    {metrics?.activeTenants || 0} active
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Customers
                  </Typography>
                  <Typography variant="h4">{metrics?.totalCustomers || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg: {metrics?.averageCustomersPerTenant || 0}/tenant
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Reservations
                  </Typography>
                  <Typography variant="h4">{metrics?.totalReservations || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg: {metrics?.averageReservationsPerTenant || 0}/tenant
                  </Typography>
                </Box>
                <ReservationIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Trial Tenants
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {metrics?.trialTenants || 0}
                  </Typography>
                  <Typography variant="caption" color="warning.main">
                    {metrics?.pausedTenants || 0} paused
                  </Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Tenant Growth */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tenant Growth Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
                  <Line type="monotone" dataKey="active" stroke="#82ca9d" name="Active" />
                  <Line type="monotone" dataKey="trial" stroke="#ffc658" name="Trial" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Plan Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Plan Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={planDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {planDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Tenants by Customers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Tenants by Customers
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell align="right">Customers</TableCell>
                      <TableCell align="right">Reservations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topByCustomers.map((tenant, index) => (
                      <TableRow key={index}>
                        <TableCell>{tenant.name}</TableCell>
                        <TableCell align="right">{tenant.customers}</TableCell>
                        <TableCell align="right">{tenant.reservations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Tenants by Reservations */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Tenants by Reservations
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Tenant</TableCell>
                      <TableCell align="right">Customers</TableCell>
                      <TableCell align="right">Reservations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topByReservations.map((tenant, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{tenant.name}</TableCell>
                        <TableCell align="right">{tenant.customers}</TableCell>
                        <TableCell align="right">{tenant.reservations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;
