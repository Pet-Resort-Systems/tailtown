import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Card,
  CardContent,
  Button,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Sms as SmsIcon,
  Email as EmailIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  ContactMail as ContactsIcon,
  Description as TemplatesIcon
} from '@mui/icons-material';

const MarketingHub: React.FC = () => {
  const navigate = useNavigate();
  
  const marketingSections = [
    {
      title: 'SMS Marketing',
      description: 'Send text message campaigns via Twilio integration',
      icon: <SmsIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/admin/marketing/sms',
      stats: 'Messages Sent: 0',
      status: 'Setup Required',
      statusColor: 'warning' as const
    },
    {
      title: 'Email Marketing',
      description: 'Create and send email campaigns via SendGrid',
      icon: <EmailIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      path: '/admin/marketing/email',
      stats: 'Emails Sent: 0',
      status: 'Setup Required',
      statusColor: 'warning' as const
    },
    {
      title: 'Campaign Manager',
      description: 'Manage all marketing campaigns and schedules',
      icon: <CampaignIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      path: '/admin/marketing/campaigns',
      stats: 'Active Campaigns: 0',
      status: 'Ready',
      statusColor: 'success' as const
    },
    {
      title: 'Contact Lists',
      description: 'Manage customer segments and contact groups',
      icon: <ContactsIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      path: '/admin/marketing/contacts',
      stats: 'Contact Lists: 0',
      status: 'Ready',
      statusColor: 'success' as const
    },
    {
      title: 'Message Templates',
      description: 'Create reusable templates for SMS and email',
      icon: <TemplatesIcon sx={{ fontSize: 40, color: 'purple' }} />,
      path: '/admin/marketing/templates',
      stats: 'Templates: 0',
      status: 'Ready',
      statusColor: 'success' as const
    },
    {
      title: 'Marketing Analytics',
      description: 'Track campaign performance and engagement metrics',
      icon: <AnalyticsIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      path: '/admin/marketing/analytics',
      stats: 'Reports Available: 5',
      status: 'Ready',
      statusColor: 'success' as const
    }
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Marketing Hub
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage SMS and email marketing campaigns to engage with your customers.
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <Grid container spacing={3}>
            {marketingSections.map((section, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => navigate(section.path)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ mr: 2 }}>
                        {section.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" component="h2" sx={{ mr: 1 }}>
                            {section.title}
                          </Typography>
                          <Chip 
                            label={section.status} 
                            color={section.statusColor}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {section.description}
                        </Typography>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'medium' }}>
                          {section.stats}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(section.path);
                        }}
                      >
                        Open →
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Quick Setup Guide */}
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Quick Setup Guide
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            To get started with marketing campaigns:
          </Typography>
          <Box component="ol" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Configure Twilio API credentials for SMS marketing
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Set up SendGrid API key for email marketing
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Create customer contact lists and segments
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Design message templates for common campaigns
            </Typography>
            <Typography component="li" variant="body2">
              Launch your first marketing campaign!
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default MarketingHub;
