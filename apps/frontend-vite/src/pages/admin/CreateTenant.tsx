import React, { useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tenantService, CreateTenantDto } from '../../services/tenantService';

const CreateTenant: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateTenantDto>({
    businessName: '',
    subdomain: '',
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
    timezone: 'America/New_York',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleChange = (field: keyof CreateTenantDto) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await tenantService.createTenant(formData);
      navigate('/admin/tenants');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Create New Tenant
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Set up a new pet resort business account
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
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
                  label="Subdomain"
                  value={formData.subdomain}
                  onChange={handleChange('subdomain')}
                  helperText="e.g., 'pawsinn' for pawsinn.tailtown.com"
                />
              </Grid>
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
                </TextField>
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
              Admin User
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="First Name"
                  value={formData.adminFirstName}
                  onChange={handleChange('adminFirstName')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Last Name"
                  value={formData.adminLastName}
                  onChange={handleChange('adminLastName')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  type="email"
                  label="Admin Email"
                  value={formData.adminEmail}
                  onChange={handleChange('adminEmail')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  type="password"
                  label="Admin Password"
                  value={formData.adminPassword}
                  onChange={handleChange('adminPassword')}
                  helperText="Minimum 8 characters"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/tenants')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Tenant'}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default CreateTenant;
