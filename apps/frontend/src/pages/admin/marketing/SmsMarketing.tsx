import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
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
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Sms as SmsIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';

const SmsMarketing: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedContacts, setSelectedContacts] = useState('');
  const [isConfigured, setIsConfigured] = useState(false); // This would come from settings

  // Mock data - replace with actual API calls
  const templates = [
    {
      id: '1',
      name: 'Appointment Reminder',
      content:
        "Hi {customerName}, this is a reminder about your pet's appointment tomorrow at {time}.",
    },
    {
      id: '2',
      name: 'Pickup Ready',
      content:
        'Hello {customerName}, {petName} is ready for pickup! Please come by when convenient.',
    },
    {
      id: '3',
      name: 'Special Offer',
      content:
        'Special offer for {customerName}! Get 20% off your next grooming service. Book now!',
    },
  ];

  const contactLists = [
    { id: '1', name: 'All Customers', count: 245 },
    { id: '2', name: 'Boarding Customers', count: 89 },
    { id: '3', name: 'Grooming Customers', count: 156 },
    { id: '4', name: 'VIP Customers', count: 23 },
  ];

  const recentCampaigns = [
    {
      id: '1',
      name: 'Holiday Boarding Reminder',
      sent: '2024-01-15',
      recipients: 89,
      status: 'Delivered',
    },
    {
      id: '2',
      name: 'Grooming Special Offer',
      sent: '2024-01-10',
      recipients: 156,
      status: 'Delivered',
    },
    {
      id: '3',
      name: 'New Year Greetings',
      sent: '2024-01-01',
      recipients: 245,
      status: 'Delivered',
    },
  ];

  const handleSendCampaign = () => {
    // TODO: Implement Twilio SMS sending
    alert('SMS campaign would be sent via Twilio integration');
  };

  const handleConfigureTwilio = () => {
    // TODO: Navigate to Twilio configuration
    alert('Navigate to Twilio API configuration');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SmsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            SMS Marketing
          </Typography>
        </Box>

        {!isConfigured && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleConfigureTwilio}
              >
                Configure
              </Button>
            }
          >
            Twilio SMS integration is not configured. Set up your Twilio
            credentials to start sending SMS campaigns.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Campaign Composer */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Create SMS Campaign
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Message Template</InputLabel>
                    <Select
                      value={selectedTemplate}
                      label="Message Template"
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
                    multiline
                    rows={4}
                    label="Message Content"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your SMS message here..."
                    helperText={`${message.length}/160 characters`}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={handleSendCampaign}
                      disabled={!isConfigured || !message || !selectedContacts}
                    >
                      Send Campaign
                    </Button>
                    <Button variant="outlined">Save as Template</Button>
                    <Button variant="outlined">Preview</Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                SMS Statistics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="h4" color="primary.main">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Messages Sent This Month
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="success.main">
                    0%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Rate
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    $0.00
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SMS Costs This Month
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Configuration
                </Typography>
                <IconButton onClick={handleConfigureTwilio}>
                  <SettingsIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    Twilio Account
                  </Typography>
                  <Chip
                    label={isConfigured ? 'Connected' : 'Not Configured'}
                    color={isConfigured ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    Phone Number
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isConfigured ? '+1 (555) 123-4567' : 'Not Set'}
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
                  Recent SMS Campaigns
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
                      secondary={`Sent: ${campaign.sent} • Recipients: ${campaign.recipients}`}
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

export default SmsMarketing;
