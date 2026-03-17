import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  People as PeopleIcon,
  TrendingUp as TrendingIcon,
  Description as TemplateIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { getApiBaseUrl } from '../../../services/api';

interface AnalyticsData {
  templates: {
    total: number;
    email: number;
    sms: number;
    active: number;
    byCategory: Record<string, number>;
  };
  customers: {
    total: number;
    withEmail: number;
    withPhone: number;
    recentlyActive: number;
  };
  engagement: {
    emailReachRate: number;
    smsReachRate: number;
  };
}

const MarketingAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    templates: { total: 0, email: 0, sms: 0, active: 0, byCategory: {} },
    customers: { total: 0, withEmail: 0, withPhone: 0, recentlyActive: 0 },
    engagement: { emailReachRate: 0, smsReachRate: 0 },
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiBaseUrl();
      const tenantId = localStorage.getItem('tailtown_tenant_id') || 'dev';
      const headers = { 'x-tenant-id': tenantId };

      // Fetch templates
      const templatesRes = await fetch(`${apiUrl}/api/message-templates`, {
        headers,
      });
      const templatesData = await templatesRes.json();

      // Fetch customers
      const customersRes = await fetch(`${apiUrl}/api/customers?limit=1000`, {
        headers,
      });
      const customersData = await customersRes.json();

      // Process template data
      const templates = templatesData.data || [];
      const templateStats = {
        total: templates.length,
        email: templates.filter((t: any) => t.type === 'EMAIL').length,
        sms: templates.filter((t: any) => t.type === 'SMS').length,
        active: templates.filter((t: any) => t.isActive).length,
        byCategory: templates.reduce((acc: Record<string, number>, t: any) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        }, {}),
      };

      // Process customer data
      const customers = customersData.data || customersData || [];
      const customerList = Array.isArray(customers) ? customers : [];
      const customerStats = {
        total: customerList.length,
        withEmail: customerList.filter((c: any) => c.email).length,
        withPhone: customerList.filter((c: any) => c.phone || c.cellPhone)
          .length,
        recentlyActive: customerList.filter((c: any) => {
          if (!c.updatedAt) return false;
          const lastActive = new Date(c.updatedAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return lastActive > thirtyDaysAgo;
        }).length,
      };

      // Calculate engagement rates
      const emailReachRate =
        customerStats.total > 0
          ? Math.round((customerStats.withEmail / customerStats.total) * 100)
          : 0;
      const smsReachRate =
        customerStats.total > 0
          ? Math.round((customerStats.withPhone / customerStats.total) * 100)
          : 0;

      setAnalytics({
        templates: templateStats,
        customers: customerStats,
        engagement: { emailReachRate, smsReachRate },
      });
    } catch (err: any) {
      console.error('Error fetching marketing analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color = 'primary.main',
    subtitle,
  }: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color?: string;
    subtitle?: string;
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color, mr: 1 }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Marketing Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Track campaign performance and customer engagement metrics.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Overview Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Customers"
              value={analytics.customers.total}
              icon={<PeopleIcon />}
              color="primary.main"
              subtitle="In your database"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Email Reachable"
              value={`${analytics.engagement.emailReachRate}%`}
              icon={<EmailIcon />}
              color="success.main"
              subtitle={`${analytics.customers.withEmail} customers`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="SMS Reachable"
              value={`${analytics.engagement.smsReachRate}%`}
              icon={<SmsIcon />}
              color="info.main"
              subtitle={`${analytics.customers.withPhone} customers`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active (30 days)"
              value={analytics.customers.recentlyActive}
              icon={<TrendingIcon />}
              color="warning.main"
              subtitle="Recently engaged"
            />
          </Grid>
        </Grid>

        {/* Templates Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Message Templates
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <TemplateIcon
                  sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                />
                <Typography variant="h3" fontWeight="bold">
                  {analytics.templates.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Templates
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Templates"
                    secondary={`${analytics.templates.email} templates`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SmsIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="SMS Templates"
                    secondary={`${analytics.templates.sms} templates`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ActiveIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Active Templates"
                    secondary={`${analytics.templates.active} ready to use`}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>

          {Object.keys(analytics.templates.byCategory).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                By Category
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(analytics.templates.byCategory).map(
                  ([category, count]) => (
                    <Chip
                      key={category}
                      label={`${category.replace(/_/g, ' ')}: ${count}`}
                      size="small"
                      variant="outlined"
                    />
                  )
                )}
              </Box>
            </Box>
          )}
        </Paper>

        {/* Customer Reach Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Customer Reach Analysis
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'success.light',
                  borderRadius: 2,
                  opacity: 0.9,
                }}
              >
                <Typography variant="h6" color="success.dark">
                  Email Marketing Potential
                </Typography>
                <Typography variant="h2" fontWeight="bold" color="success.dark">
                  {analytics.customers.withEmail}
                </Typography>
                <Typography variant="body2" color="success.dark">
                  customers can receive email campaigns
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="success.dark">
                    {analytics.engagement.emailReachRate}% of your customer base
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'info.light',
                  borderRadius: 2,
                  opacity: 0.9,
                }}
              >
                <Typography variant="h6" color="info.dark">
                  SMS Marketing Potential
                </Typography>
                <Typography variant="h2" fontWeight="bold" color="info.dark">
                  {analytics.customers.withPhone}
                </Typography>
                <Typography variant="body2" color="info.dark">
                  customers can receive SMS campaigns
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="info.dark">
                    {analytics.engagement.smsReachRate}% of your customer base
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default MarketingAnalytics;
