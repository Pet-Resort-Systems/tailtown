import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import checkInService from '../../services/checkInService';
import TemplateEditor from '../../components/admin/TemplateEditor';
import ConfigurationEditor from '../../components/admin/ConfigurationEditor';

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
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CheckInTemplateManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await checkInService.getAllTemplates();
      setTemplates(response.data || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load templates: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate({
      name: 'New Template',
      description: '',
      isDefault: false,
      isActive: true,
      sections: []
    });
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
  };

  const handleSaveTemplate = async (template: any) => {
    try {
      if (template.id) {
        // Update existing template - only send necessary fields
        const updateData = {
          name: template.name,
          description: template.description,
          isActive: template.isActive,
          isDefault: template.isDefault,
          sections: template.sections
        };
        console.log('Saving template:', template.id, updateData);
        await checkInService.updateTemplate(template.id, updateData);
      } else {
        // Create new template
        await checkInService.createTemplate(template);
      }
      await loadTemplates();
      setSelectedTemplate(null);
      setError(null);
    } catch (err: any) {
      console.error('Save error:', err);
      setError('Failed to save template: ' + (err.response?.data?.error || err.message || 'Unknown error'));
    }
  };

  const handleCancel = () => {
    setSelectedTemplate(null);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Check-In Configuration
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTemplate}
          >
            New Template
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ width: '100%' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="check-in configuration tabs">
            <Tab label="Templates" />
            <Tab label="Pre-populated Options" />
            <Tab label="Settings" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : selectedTemplate ? (
              <TemplateEditor
                template={selectedTemplate}
                onSave={handleSaveTemplate}
                onCancel={handleCancel}
              />
            ) : (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Available Templates
                </Typography>
                {templates.length === 0 ? (
                  <Alert severity="info">
                    No templates found. Create your first template to get started.
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {templates.map((template) => (
                      <Paper
                        key={template.id}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="h6">
                              {template.name}
                              {template.isDefault && (
                                <Typography component="span" color="primary" sx={{ ml: 1, fontSize: '0.875rem' }}>
                                  (Default)
                                </Typography>
                              )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {template.description}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color={template.isActive ? 'success.main' : 'text.disabled'}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <ConfigurationEditor />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>
              <Alert severity="info">
                Settings configuration coming soon...
              </Alert>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default CheckInTemplateManager;
