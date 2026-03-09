import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Tenant Management',
      description: 'Manage multi-tenant accounts, subscriptions, and provisioning',
      icon: <BusinessIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: '/tenants',
    },
    {
      title: 'Platform Analytics',
      description: 'View platform-wide statistics and usage metrics',
      icon: <AnalyticsIcon sx={{ fontSize: 60, color: 'success.main' }} />,
      path: '/analytics',
      disabled: false,
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings and integrations',
      icon: <SettingsIcon sx={{ fontSize: 60, color: 'info.main' }} />,
      path: '/settings',
      disabled: true,
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Tailtown Admin Portal
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph align="center">
          Platform Administration & Management
        </Typography>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          {sections.map((section, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: section.disabled ? 'not-allowed' : 'pointer',
                  opacity: section.disabled ? 0.6 : 1,
                  '&:hover': {
                    boxShadow: section.disabled ? 2 : 6,
                    transform: section.disabled ? 'none' : 'translateY(-4px)',
                  },
                  transition: 'all 0.3s',
                }}
                onClick={() => !section.disabled && navigate(section.path)}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box sx={{ mb: 2 }}>{section.icon}</Box>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {section.description}
                  </Typography>
                  {section.disabled && (
                    <Typography variant="caption" color="warning.main">
                      Coming Soon
                    </Typography>
                  )}
                  {!section.disabled && (
                    <Button
                      variant="contained"
                      sx={{ mt: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(section.path);
                      }}
                    >
                      Open
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Quick Stats
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Total Tenants
              </Typography>
              <Typography variant="h4">-</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Active Subscriptions
              </Typography>
              <Typography variant="h4">-</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Platform Status
              </Typography>
              <Typography variant="h4" color="success.main">
                Operational
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
