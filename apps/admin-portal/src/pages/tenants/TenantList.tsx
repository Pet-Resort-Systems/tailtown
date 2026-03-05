import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { tenantService, Tenant } from '../../services/tenantService';

const TenantList: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'pause' | 'reactivate' | 'delete' | null;
    tenant: Tenant | null;
  }>({
    open: false,
    action: null,
    tenant: null,
  });

  useEffect(() => {
    loadTenants();
  }, [filterStatus]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterStatus) filters.status = filterStatus;
      
      const data = await tenantService.getAllTenants(filters);
      setTenants(data);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseTenant = async (tenant: Tenant) => {
    try {
      await tenantService.pauseTenant(tenant.id);
      loadTenants();
      setConfirmDialog({ open: false, action: null, tenant: null });
    } catch (error) {
      console.error('Error pausing tenant:', error);
    }
  };

  const handleReactivateTenant = async (tenant: Tenant) => {
    try {
      await tenantService.reactivateTenant(tenant.id);
      loadTenants();
      setConfirmDialog({ open: false, action: null, tenant: null });
    } catch (error) {
      console.error('Error reactivating tenant:', error);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    try {
      await tenantService.deleteTenant(tenant.id);
      loadTenants();
      setConfirmDialog({ open: false, action: null, tenant: null });
    } catch (error) {
      console.error('Error deleting tenant:', error);
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

  const filteredTenants = tenants.filter((tenant) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tenant.businessName.toLowerCase().includes(searchLower) ||
      tenant.subdomain.toLowerCase().includes(searchLower) ||
      tenant.contactEmail.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === 'ACTIVE').length,
    trial: tenants.filter((t) => t.status === 'TRIAL').length,
    paused: tenants.filter((t) => t.isPaused).length,
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Tenant Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/tenants/new')}
        >
          Create New Tenant
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Tenants
                  </Typography>
                  <Typography variant="h4">{stats.total}</Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Active
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.active}
                  </Typography>
                </Box>
                <PlayIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Trial
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {stats.trial}
                  </Typography>
                </Box>
                <CalendarIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Paused
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.paused}
                  </Typography>
                </Box>
                <PauseIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by business name, subdomain, or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="TRIAL">Trial</MenuItem>
                <MenuItem value="PAUSED">Paused</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="outlined" onClick={loadTenants}>
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tenants Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Business Name</TableCell>
              <TableCell>Subdomain</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell align="center">Customers</TableCell>
              <TableCell align="center">Employees</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No tenants found
                </TableCell>
              </TableRow>
            ) : (
              filteredTenants.map((tenant) => (
                <TableRow key={tenant.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {tenant.businessName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={tenant.subdomain} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{tenant.contactName}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {tenant.contactEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.status}
                      color={getStatusColor(tenant.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{tenant.planType}</TableCell>
                  <TableCell align="center">{tenant.customerCount}</TableCell>
                  <TableCell align="center">{tenant.employeeCount}</TableCell>
                  <TableCell>
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/admin/tenants/${tenant.id}/edit`)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {tenant.isPaused ? (
                      <Tooltip title="Reactivate">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() =>
                            setConfirmDialog({ open: true, action: 'reactivate', tenant })
                          }
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Pause">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() =>
                            setConfirmDialog({ open: true, action: 'pause', tenant })
                          }
                        >
                          <PauseIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          setConfirmDialog({ open: true, action: 'delete', tenant })
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, tenant: null })}
      >
        <DialogTitle>
          {confirmDialog.action === 'pause' && 'Pause Tenant'}
          {confirmDialog.action === 'reactivate' && 'Reactivate Tenant'}
          {confirmDialog.action === 'delete' && 'Delete Tenant'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'pause' &&
              `Are you sure you want to pause ${confirmDialog.tenant?.businessName}? All users will be disabled.`}
            {confirmDialog.action === 'reactivate' &&
              `Are you sure you want to reactivate ${confirmDialog.tenant?.businessName}?`}
            {confirmDialog.action === 'delete' &&
              `Are you sure you want to delete ${confirmDialog.tenant?.businessName}? This action cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, action: null, tenant: null })}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.action === 'delete' ? 'error' : 'primary'}
            onClick={() => {
              if (confirmDialog.tenant) {
                if (confirmDialog.action === 'pause') {
                  handlePauseTenant(confirmDialog.tenant);
                } else if (confirmDialog.action === 'reactivate') {
                  handleReactivateTenant(confirmDialog.tenant);
                } else if (confirmDialog.action === 'delete') {
                  handleDeleteTenant(confirmDialog.tenant);
                }
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TenantList;