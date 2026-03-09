import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  TextField,
  Typography,
  Alert,
  MenuItem,
  IconButton,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { tenantService, Tenant, UpdateTenantDto } from '../../services/tenantService';

const TenantEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<UpdateTenantDto>({
    businessName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    planType: 'STARTER',
    maxEmployees: 50,
    maxLocations: 1,
    timezone: 'America/New_York',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  });

  useEffect(() => {
    if (id) {
      loadTenant();
    }
  }, [id]);

  const loadTenant = async () => {
    try {
      setLoading(true);
      const tenant = await tenantService.getTenantById(id!);
      setFormData({
        businessName: tenant.businessName,
        contactName: tenant.contactName,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone || '',
        address: tenant.address || '',
        city: tenant.city || '',
        state: tenant.state || '',
        zipCode: tenant.zipCode || '',
        country: tenant.country,
        planType: tenant.planType,
        maxEmployees: tenant.maxEmployees,
        maxLocations: tenant.maxLocations,
        timezone: tenant.timezone,
        currency: tenant.currency,
        dateFormat: tenant.dateFormat,
        timeFormat: tenant.timeFormat,
      });
    } catch (err: any) {
      setError('Failed to load tenant');
      console.error('Error loading tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UpdateTenantDto) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await tenantService.updateTenant(id!, formData);
      setSuccess('Tenant updated successfully');
      setTimeout(() => {
        navigate(`/admin/tenants/${id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(`/admin/tenants/${id}`)} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1">
            Edit Tenant
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Update tenant information and settings
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Business Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Business Name"
                  value={formData.businessName}
                  onChange={handleChange('businessName')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Contact Name"
                  value={formData.contactName}
                  onChange={handleChange('contactName')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  type="email"
                  label="Contact Email"
                  value={formData.contactEmail}
                  onChange={handleChange('contactEmail')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={formData.contactPhone}
                  onChange={handleChange('contactPhone')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={handleChange('country')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.address}
                  onChange={handleChange('address')}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={handleChange('city')}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.state}
                  onChange={handleChange('state')}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Zip Code"
                  value={formData.zipCode}
                  onChange={handleChange('zipCode')}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Subscription Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Plan Type"
                  value={formData.planType}
                  onChange={handleChange('planType')}
                >
                  <MenuItem value="STARTER">Starter</MenuItem>
                  <MenuItem value="PROFESSIONAL">Professional</MenuItem>
                  <MenuItem value="ENTERPRISE">Enterprise</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Employees"
                  value={formData.maxEmployees}
                  onChange={handleChange('maxEmployees')}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Locations"
                  value={formData.maxLocations}
                  onChange={handleChange('maxLocations')}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Regional Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Timezone"
                  value={formData.timezone}
                  onChange={handleChange('timezone')}
                >
                  <MenuItem value="America/New_York">Eastern Time</MenuItem>
                  <MenuItem value="America/Chicago">Central Time</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                  <MenuItem value="America/Phoenix">Arizona Time</MenuItem>
                  <MenuItem value="America/Anchorage">Alaska Time</MenuItem>
                  <MenuItem value="Pacific/Honolulu">Hawaii Time</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Currency"
                  value={formData.currency}
                  onChange={handleChange('currency')}
                >
                  <MenuItem value="USD">USD - US Dollar</MenuItem>
                  <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                  <MenuItem value="EUR">EUR - Euro</MenuItem>
                  <MenuItem value="GBP">GBP - British Pound</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Date Format"
                  value={formData.dateFormat}
                  onChange={handleChange('dateFormat')}
                >
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Time Format"
                  value={formData.timeFormat}
                  onChange={handleChange('timeFormat')}
                >
                  <MenuItem value="12h">12-hour (AM/PM)</MenuItem>
                  <MenuItem value="24h">24-hour</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/admin/tenants/${id}`)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default TenantEdit;
