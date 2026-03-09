import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Pets as PetsIcon,
  EventNote as ReservationIcon,
  Storage as StorageIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { tenantService, Tenant, TenantUsage } from '../../services/tenantService';

const TenantDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'pause' | 'reactivate' | 'delete' | null;
  }>({
    open: false,
    action: null,
  });

  useEffect(() => {
    if (id) {
      loadTenant();
      loadUsage();
    }
  }, [id]);

  const loadTenant = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getTenantById(id!);
      setTenant(data);
    } catch (err: any) {
      setError('Failed to load tenant');
      console.error('Error loading tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      const data = await tenantService.getTenantUsage(id!);
      setUsage(data);
    } catch (err) {
      console.error('Error loading usage:', err);
    }
  };

  const handlePause = async () => {
    try {
      await tenantService.pauseTenant(id!);
      loadTenant();
      setConfirmDialog({ open: false, action: null });
    } catch (err) {
      setError('Failed to pause tenant');
    }
  };

  const handleReactivate = async () => {
    try {
      await tenantService.reactivateTenant(id!);
      loadTenant();
      setConfirmDialog({ open: false, action: null });
    } catch (err) {
      setError('Failed to reactivate tenant');
    }
  };

  const handleDelete = async () => {
    try {
      await tenantService.deleteTenant(id!);
      navigate('/admin/tenants');
    } catch (err) {
      setError('Failed to delete tenant');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'TRIAL':
        return 'info';
      case 'PAUSED':
        return 'warning';
      case 'CANCELLED':
      case 'DELETED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!tenant) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Tenant not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/tenants')} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {tenant.businessName}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {tenant.subdomain}.tailtown.com
          </Typography>
        </Box>
        <Chip
          label={tenant.status}
          color={getStatusColor(tenant.status) as any}
          sx={{ mr: 2 }}
        />
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/admin/tenants/${id}/edit`)}
          sx={{ mr: 1 }}
        >
          Edit
        </Button>
        {tenant.isPaused ? (
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayIcon />}
            onClick={() => setConfirmDialog({ open: true, action: 'reactivate' })}
            sx={{ mr: 1 }}
          >
            Reactivate
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<PauseIcon />}
            onClick={() => setConfirmDialog({ open: true, action: 'pause' })}
            sx={{ mr: 1 }}
          >
            Pause
          </Button>
        )}
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setConfirmDialog({ open: true, action: 'delete' })}
        >
          Delete
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Usage Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Customers
                  </Typography>
                  <Typography variant="h4">{usage?.customerCount || tenant.customerCount}</Typography>
                </Box>
                <PetsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Reservations
                  </Typography>
                  <Typography variant="h4">{usage?.reservationCount || tenant.reservationCount}</Typography>
                </Box>
                <ReservationIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Employees
                  </Typography>
                  <Typography variant="h4">{usage?.employeeCount || tenant.employeeCount}</Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Storage
                  </Typography>
                  <Typography variant="h4">{tenant.storageUsedMB} MB</Typography>
                </Box>
                <StorageIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Business Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Business Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Business Name
                  </Typography>
                  <Typography variant="body1">{tenant.businessName}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Contact Email
                  </Typography>
                  <Typography variant="body1">{tenant.contactEmail}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Contact Phone
                  </Typography>
                  <Typography variant="body1">{tenant.contactPhone || 'N/A'}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {tenant.address || 'N/A'}
                    {tenant.city && `, ${tenant.city}`}
                    {tenant.state && `, ${tenant.state}`}
                    {tenant.zipCode && ` ${tenant.zipCode}`}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Contact Name
                  </Typography>
                  <Typography variant="body1">{tenant.contactName}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Subscription & Settings */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Plan Type
                </Typography>
                <Typography variant="body1">{tenant.planType}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Max Employees
                </Typography>
                <Typography variant="body1">{tenant.maxEmployees}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Max Locations
                </Typography>
                <Typography variant="body1">{tenant.maxLocations}</Typography>
              </Box>
              {tenant.trialEndsAt && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Trial Ends
                  </Typography>
                  <Typography variant="body1">{formatDate(tenant.trialEndsAt)}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Timezone
                </Typography>
                <Typography variant="body1">{tenant.timezone}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Currency
                </Typography>
                <Typography variant="body1">{tenant.currency}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Date Format
                </Typography>
                <Typography variant="body1">{tenant.dateFormat}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Time Format
                </Typography>
                <Typography variant="body1">{tenant.timeFormat}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Important Dates */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Important Dates
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="textSecondary">
                Created
              </Typography>
              <Typography variant="body1">{formatDate(tenant.createdAt)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="textSecondary">
                Last Updated
              </Typography>
              <Typography variant="body1">{formatDate(tenant.updatedAt)}</Typography>
            </Grid>
            {tenant.subscriptionStartDate && (
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="textSecondary">
                  Subscription Start
                </Typography>
                <Typography variant="body1">{formatDate(tenant.subscriptionStartDate)}</Typography>
              </Grid>
            )}
            {tenant.pausedAt && (
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="textSecondary">
                  Paused At
                </Typography>
                <Typography variant="body1">{formatDate(tenant.pausedAt)}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Admin Users */}
      {tenant.users && tenant.users.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Admin Users
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenant.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null })}
      >
        <DialogTitle>
          {confirmDialog.action === 'pause' && 'Pause Tenant'}
          {confirmDialog.action === 'reactivate' && 'Reactivate Tenant'}
          {confirmDialog.action === 'delete' && 'Delete Tenant'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'pause' &&
              `Are you sure you want to pause ${tenant.businessName}? All users will be disabled.`}
            {confirmDialog.action === 'reactivate' &&
              `Are you sure you want to reactivate ${tenant.businessName}?`}
            {confirmDialog.action === 'delete' &&
              `Are you sure you want to delete ${tenant.businessName}? This action cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.action === 'delete' ? 'error' : 'primary'}
            onClick={() => {
              if (confirmDialog.action === 'pause') handlePause();
              else if (confirmDialog.action === 'reactivate') handleReactivate();
              else if (confirmDialog.action === 'delete') handleDelete();
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TenantDetail;
