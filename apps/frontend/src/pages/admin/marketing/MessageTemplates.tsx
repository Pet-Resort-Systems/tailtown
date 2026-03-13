import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Sms as SmsIcon,
  Email as EmailIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import messageTemplateService from '../../../services/messageTemplateService';

interface Template {
  id: string;
  name: string;
  type: 'sms' | 'email';
  category: 'appointment_reminder' | 'marketing' | 'confirmation' | 'follow_up' | 'promotional';
  subject?: string; // For email only
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
}

const MessageTemplates: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openUseDialog, setOpenUseDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [formData, setFormData] = useState({
    name: '',
    type: 'sms' as 'sms' | 'email',
    category: 'appointment_reminder' as Template['category'],
    subject: '',
    body: ''
  });

  const [templates, setTemplates] = useState<Template[]>([]);

  // Load templates from API
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await messageTemplateService.getAllTemplates();
      // Convert API format to component format
      const convertedTemplates: Template[] = data.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type.toLowerCase() as 'sms' | 'email',
        category: t.category.toLowerCase() as Template['category'],
        subject: t.subject,
        body: t.body,
        variables: t.variables,
        isActive: t.isActive,
        createdAt: t.createdAt
      }));
      setTemplates(convertedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      setSnackbar({ open: true, message: 'Failed to load templates', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        type: template.type,
        category: template.category,
        subject: template.subject || '',
        body: template.body
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        type: 'sms',
        category: 'appointment_reminder',
        subject: '',
        body: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
  };

  const handleSaveTemplate = async () => {
    try {
      const data = {
        name: formData.name,
        type: formData.type.toUpperCase() as 'SMS' | 'EMAIL',
        category: formData.category.toUpperCase() as any,
        subject: formData.subject,
        body: formData.body
      };

      if (editingTemplate) {
        // Update existing template
        await messageTemplateService.updateTemplate(editingTemplate.id, data);
        setSnackbar({ open: true, message: 'Template updated successfully', severity: 'success' });
      } else {
        // Create new template
        await messageTemplateService.createTemplate(data);
        setSnackbar({ open: true, message: 'Template created successfully', severity: 'success' });
      }
      
      handleCloseDialog();
      loadTemplates(); // Reload templates
    } catch (error) {
      console.error('Error saving template:', error);
      setSnackbar({ open: true, message: 'Failed to save template', severity: 'error' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await messageTemplateService.deleteTemplate(id);
        setSnackbar({ open: true, message: 'Template deleted successfully', severity: 'success' });
        loadTemplates(); // Reload templates
      } catch (error) {
        console.error('Error deleting template:', error);
        setSnackbar({ open: true, message: 'Failed to delete template', severity: 'error' });
      }
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      await messageTemplateService.duplicateTemplate(template.id);
      setSnackbar({ open: true, message: 'Template duplicated successfully', severity: 'success' });
      loadTemplates(); // Reload templates
    } catch (error) {
      console.error('Error duplicating template:', error);
      setSnackbar({ open: true, message: 'Failed to duplicate template', severity: 'error' });
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return t.type === 'sms';
    if (tabValue === 2) return t.type === 'email';
    if (tabValue === 3) return t.category === 'appointment_reminder';
    if (tabValue === 4) return t.category === 'marketing' || t.category === 'promotional';
    return true;
  });

  const getCategoryColor = (category: Template['category']) => {
    const colors = {
      appointment_reminder: 'primary',
      marketing: 'success',
      confirmation: 'info',
      follow_up: 'warning',
      promotional: 'secondary'
    };
    return colors[category] || 'default';
  };

  const getCategoryLabel = (category: Template['category']) => {
    const labels = {
      appointment_reminder: 'Appointment Reminder',
      marketing: 'Marketing',
      confirmation: 'Confirmation',
      follow_up: 'Follow-Up',
      promotional: 'Promotional'
    };
    return labels[category];
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Message Templates
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage reusable templates for SMS and email communications
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Template
          </Button>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="All Templates" />
            <Tab icon={<SmsIcon />} label="SMS" iconPosition="start" />
            <Tab icon={<EmailIcon />} label="Email" iconPosition="start" />
            <Tab icon={<NotificationIcon />} label="Reminders" iconPosition="start" />
            <Tab label="Marketing" />
          </Tabs>
        </Paper>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Available Variables:</strong> Use double curly braces to insert dynamic content. 
            Common variables: customerName, petName, appointmentTime, businessName, businessPhone (wrap in double curly braces)
          </Typography>
        </Alert>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredTemplates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {template.type === 'sms' ? (
                      <SmsIcon sx={{ mr: 1, color: 'primary.main' }} />
                    ) : (
                      <EmailIcon sx={{ mr: 1, color: 'success.main' }} />
                    )}
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {template.name}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={getCategoryLabel(template.category)} 
                      color={getCategoryColor(template.category) as any}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={template.type.toUpperCase()} 
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  {template.subject && (
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Subject: {template.subject}
                    </Typography>
                  )}

                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      mt: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {template.body}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Variables: {template.variables.length}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(template)}
                      title="Edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDuplicateTemplate(template)}
                      title="Duplicate"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteTemplate(template.id)}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setOpenUseDialog(true);
                    }}
                  >
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          </Grid>
        )}

        {!loading && filteredTemplates.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No templates found
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first template to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create Template
            </Button>
          </Paper>
        )}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Edit Template' : 'Create New Template'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Template Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'sms' | 'email' })}
              >
                <MenuItem value="sms">SMS</MenuItem>
                <MenuItem value="email">Email</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Template['category'] })}
              >
                <MenuItem value="appointment_reminder">Appointment Reminder</MenuItem>
                <MenuItem value="confirmation">Confirmation</MenuItem>
                <MenuItem value="follow_up">Follow-Up</MenuItem>
                <MenuItem value="marketing">Marketing</MenuItem>
                <MenuItem value="promotional">Promotional</MenuItem>
              </Select>
            </FormControl>

            {formData.type === 'email' && (
              <TextField
                label="Email Subject"
                fullWidth
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                helperText="Use {{variableName}} for dynamic content"
              />
            )}

            <TextField
              label="Message Body"
              fullWidth
              multiline
              rows={8}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              helperText="Use {{variableName}} for dynamic content (e.g., {{customerName}}, {{petName}})"
              required
            />

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Common Variables (wrap in double curly braces):</strong><br />
                customerName, petName, appointmentTime, appointmentDate, serviceName, businessName, businessPhone, businessAddress
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveTemplate} 
            variant="contained"
            disabled={!formData.name || !formData.body}
          >
            {editingTemplate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Use Template Dialog */}
      <Dialog open={openUseDialog} onClose={() => setOpenUseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Use Template: {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Next Steps:</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                1. Go to <strong>SMS Marketing</strong> or <strong>Email Marketing</strong> to send this template<br />
                2. Select recipients from your customer list<br />
                3. The template will auto-fill with customer/pet data<br />
                4. Review and send!
              </Typography>
            </Alert>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Template Preview:
            </Typography>
            
            {selectedTemplate?.subject && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Subject:</Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{selectedTemplate.subject}</Typography>
                </Paper>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Message:</Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedTemplate?.body}
                </Typography>
              </Paper>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Variables ({selectedTemplate?.variables.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {selectedTemplate?.variables.map((variable) => (
                  <Chip key={variable} label={variable} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUseDialog(false)}>Close</Button>
          <Button 
            variant="contained"
            onClick={() => {
              setOpenUseDialog(false);
              // Navigate to appropriate marketing page
              const path = selectedTemplate?.type === 'sms' 
                ? '/admin/marketing/sms' 
                : '/admin/marketing/email';
              window.location.href = path + '?template=' + selectedTemplate?.id;
            }}
          >
            Go to {selectedTemplate?.type === 'sms' ? 'SMS' : 'Email'} Marketing →
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MessageTemplates;
