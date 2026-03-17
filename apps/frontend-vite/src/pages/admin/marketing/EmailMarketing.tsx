import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../../services/api';
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
  Tab,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Preview as PreviewIcon,
  Code as CodeIcon,
  Visibility as VisualIcon,
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
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface Template {
  id: string;
  name: string;
  subject?: string;
  body: string;
  type: string;
  category: string;
  isActive?: boolean;
}

interface ContactList {
  id: string;
  name: string;
  count: number;
}

const EmailMarketing: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedContacts, setSelectedContacts] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiBaseUrl();
      const tenantId = localStorage.getItem('tailtown_tenant_id') || 'dev';
      const headers = { 'x-tenant-id': tenantId };

      // Fetch email templates
      const templatesRes = await fetch(
        `${apiUrl}/api/message-templates?type=EMAIL`,
        { headers }
      );
      const templatesData = await templatesRes.json();
      if (templatesData.status === 'success') {
        setTemplates(templatesData.data || []);
      }

      // Fetch customers for contact lists
      const customersRes = await fetch(`${apiUrl}/api/customers?limit=1000`, {
        headers,
      });
      const customersData = await customersRes.json();
      const customers = customersData.data || customersData || [];
      const customerList = Array.isArray(customers) ? customers : [];
      setCustomerCount(customerList.length);

      // Build contact lists from real data
      const withEmail = customerList.filter((c: any) => c.email).length;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCustomers = customerList.filter((c: any) => {
        if (!c.updatedAt) return false;
        return new Date(c.updatedAt) > thirtyDaysAgo;
      }).length;

      setContactLists([
        { id: 'all', name: 'All Customers', count: customerList.length },
        { id: 'email', name: 'Customers with Email', count: withEmail },
        { id: 'recent', name: 'Active (Last 30 Days)', count: recentCustomers },
      ]);

      // Check SendGrid config
      const configRes = await fetch(`${apiUrl}/api/email/config`, { headers });
      const configData = await configRes.json();
      setIsConfigured(configData.data?.isConfigured || false);
    } catch (error) {
      console.error('Error fetching email marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

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
              <Button
                color="inherit"
                size="small"
                onClick={handleConfigureSendGrid}
              >
                Configure
              </Button>
            }
          >
            SendGrid email integration is not configured. Set up your SendGrid
            API key to start sending email campaigns.
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
                          {template.name}{' '}
                          {template.category &&
                            `(${template.category.replace(/_/g, ' ')})`}
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
                      disabled={
                        !isConfigured ||
                        !subject ||
                        !emailContent ||
                        !selectedContacts
                      }
                    >
                      Send Campaign
                    </Button>
                    <Button variant="outlined">Save as Template</Button>
                    <Button variant="outlined" startIcon={<PreviewIcon />}>
                      Preview
                    </Button>
                    <Button variant="outlined">Test Send</Button>
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
                  <Typography variant="h4" color="primary.main">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Emails Sent This Month
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="success.main">
                    0%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Open Rate
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    0%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click-Through Rate
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {customerCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Customers
                  </Typography>
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
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    SendGrid Account
                  </Typography>
                  <Chip
                    label={isConfigured ? 'Connected' : 'Not Configured'}
                    color={isConfigured ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    From Email
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isConfigured ? 'noreply@tailtown.com' : 'Not Set'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    Monthly Limit
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isConfigured ? '10,000 emails' : 'Not Set'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Available Templates */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Available Email Templates ({templates.length})
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    (window.location.href = '/admin/marketing/templates')
                  }
                >
                  Manage Templates
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {templates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    No email templates yet. Create templates to get started.
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 2 }}
                    onClick={() =>
                      (window.location.href = '/admin/marketing/templates')
                    }
                  >
                    Create First Template
                  </Button>
                </Box>
              ) : (
                <List>
                  {templates.map((template) => (
                    <ListItem key={template.id} divider>
                      <ListItemText
                        primary={template.name}
                        secondary={template.subject || 'No subject set'}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={
                            template.category?.replace(/_/g, ' ') || 'General'
                          }
                          color="primary"
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={template.isActive ? 'Active' : 'Inactive'}
                          color={template.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default EmailMarketing;
