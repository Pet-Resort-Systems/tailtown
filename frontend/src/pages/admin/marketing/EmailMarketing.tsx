import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Email as EmailIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Preview as PreviewIcon,
  Code as CodeIcon,
  Visibility as VisualIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`email-tabpanel-${index}`}
      aria-labelledby={`email-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const EmailMarketing: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedContacts, setSelectedContacts] = useState('');
  const [isConfigured, setIsConfigured] = useState(false); // This would come from settings
  const [tabValue, setTabValue] = useState(0);

  // Mock data - replace with actual API calls
  const templates = [
    { id: '1', name: 'Welcome Email', subject: 'Welcome to Tailtown Pet Resort!' },
    { id: '2', name: 'Appointment Confirmation', subject: 'Your appointment is confirmed' },
    { id: '3', name: 'Newsletter Template', subject: 'Monthly Newsletter - Pet Care Tips' },
    { id: '4', name: 'Special Promotion', subject: 'Exclusive offer just for you!' }
  ];

  const contactLists = [
    { id: '1', name: 'All Customers', count: 245 },
    { id: '2', name: 'Newsletter Subscribers', count: 189 },
    { id: '3', name: 'VIP Customers', count: 23 },
    { id: '4', name: 'Inactive Customers', count: 67 }
  ];

  const recentCampaigns = [
    { id: '1', name: 'January Newsletter', sent: '2024-01-15', recipients: 189, openRate: '24.5%', status: 'Delivered' },
    { id: '2', name: 'New Year Special Offer', sent: '2024-01-01', recipients: 245, openRate: '31.2%', status: 'Delivered' },
    { id: '3', name: 'Holiday Boarding Info', sent: '2023-12-20', recipients: 89, openRate: '28.7%', status: 'Delivered' }
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSendCampaign = () => {
    // TODO: Implement SendGrid email sending
    alert('Email campaign would be sent via SendGrid integration');
  };

  const handleConfigureSendGrid = () => {
    // TODO: Navigate to SendGrid configuration
    alert('Navigate to SendGrid API configuration');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <EmailIcon sx={{ fontSize: 40, mr: 2, color: 'success.main' }} />
          <Typography variant="h4" component="h1">
            Email Marketing
          </Typography>
        </Box>

        {!isConfigured && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleConfigureSendGrid}>
                Configure
              </Button>
            }
          >
            SendGrid email integration is not configured. Set up your SendGrid API key to start sending email campaigns.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Email Composer */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Create Email Campaign
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Email Template</InputLabel>
                    <Select
                      value={selectedTemplate}
                      label="Email Template"
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Start from scratch</em>
                      </MenuItem>
                      {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          {template.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Contact List</InputLabel>
                    <Select
                      value={selectedContacts}
                      label="Contact List"
                      onChange={(e) => setSelectedContacts(e.target.value)}
                    >
                      {contactLists.map((list) => (
                        <MenuItem key={list.id} value={list.id}>
                          {list.name} ({list.count} contacts)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Subject Line"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                      <Tab icon={<VisualIcon />} label="Visual Editor" />
                      <Tab icon={<CodeIcon />} label="HTML Editor" />
                    </Tabs>
                  </Box>
                  
                  <TabPanel value={tabValue} index={0}>
                    <TextField
                      fullWidth
                      multiline
                      rows={12}
                      label="Email Content"
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      placeholder="Type your email content here..."
                      helperText="Rich text editor would be implemented here"
                    />
                  </TabPanel>
                  
                  <TabPanel value={tabValue} index={1}>
                    <TextField
                      fullWidth
                      multiline
                      rows={12}
                      label="HTML Content"
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      placeholder="<html>...</html>"
                      helperText="Enter raw HTML for advanced customization"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </TabPanel>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button 
                      variant="contained" 
                      startIcon={<SendIcon />}
                      onClick={handleSendCampaign}
                      disabled={!isConfigured || !subject || !emailContent || !selectedContacts}
                    >
                      Send Campaign
                    </Button>
                    <Button variant="outlined">
                      Save as Template
                    </Button>
                    <Button variant="outlined" startIcon={<PreviewIcon />}>
                      Preview
                    </Button>
                    <Button variant="outlined">
                      Test Send
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Email Statistics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="h4" color="primary.main">0</Typography>
                  <Typography variant="body2" color="text.secondary">Emails Sent This Month</Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="success.main">0%</Typography>
                  <Typography variant="body2" color="text.secondary">Average Open Rate</Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="warning.main">0%</Typography>
                  <Typography variant="body2" color="text.secondary">Click-Through Rate</Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="info.main">0</Typography>
                  <Typography variant="body2" color="text.secondary">Active Subscribers</Typography>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Configuration
                </Typography>
                <IconButton onClick={handleConfigureSendGrid}>
                  <SettingsIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>SendGrid Account</Typography>
                  <Chip 
                    label={isConfigured ? "Connected" : "Not Configured"} 
                    color={isConfigured ? "success" : "error"}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>From Email</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isConfigured ? "noreply@tailtown.com" : "Not Set"}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>Monthly Limit</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isConfigured ? "10,000 emails" : "Not Set"}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Recent Campaigns */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Recent Email Campaigns
                </Typography>
                <Button startIcon={<AddIcon />} variant="outlined" size="small">
                  New Campaign
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                {recentCampaigns.map((campaign) => (
                  <ListItem key={campaign.id} divider>
                    <ListItemText
                      primary={campaign.name}
                      secondary={`Sent: ${campaign.sent} • Recipients: ${campaign.recipients} • Open Rate: ${campaign.openRate}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={campaign.status} 
                        color="success" 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      <IconButton edge="end" size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default EmailMarketing;
