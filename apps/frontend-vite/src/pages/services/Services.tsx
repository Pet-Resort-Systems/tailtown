import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import WarningIcon from '@mui/icons-material/Warning';

import { serviceManagement } from '../../services/serviceManagement';
import { Service } from '../../types/service';

const Services: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const loadServices = useCallback(async () => {
    try {
      const response = await serviceManagement.getAllServices({ limit: 100 });
      if (Array.isArray(response)) {
        setServices(response);
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        setServices(response.data.data);
      } else if (response?.data && Array.isArray(response.data)) {
        setServices(response.data);
      } else {
        console.error('Invalid services response format:', response);
        setServices([]);
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading services:', err);
      if (err.response) {
        console.error('Response error:', err.response.data);
      }
      setSnackbar({
        open: true,
        message: 'Failed to load services',
        severity: 'error'
      });
      setServices([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleAddService = () => {
    navigate('/services/new');
  };

  const handleEditService = (id: string) => {
    navigate(`/services/${id}`);
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;

    try {
      // First try to delete the service
      try {
        const result = await serviceManagement.deleteService(serviceToDelete.id);
        
        // Check if it was a soft delete (returns a message) or hard delete (returns nothing)
        const message = result?.message || 'Service deleted successfully';
        
        setSnackbar({
          open: true,
          message,
          severity: 'success'
        });
        loadServices();
      } catch (deleteErr: any) {
        // If deletion fails due to active reservations, automatically deactivate instead
        if (deleteErr.message && (deleteErr.message.includes('active reservations') || deleteErr.message.includes('deactivate'))) {
          console.log('Service could not be deleted, automatically deactivating instead');
          
          // Automatically deactivate the service
          await serviceManagement.deactivateService(serviceToDelete.id);
          
          setSnackbar({
            open: true,
            message: 'Service has been deactivated instead of deleted because it has reservations',
            severity: 'success'
          });
          loadServices();
        } else {
          // For other errors, just show the error message
          throw deleteErr;
        }
      }
    } catch (err: any) {
      // Show the specific error message for any other errors
      const errorMessage = err.message || 'Failed to delete service';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
    
    // Always close the delete dialog and clear the service reference
    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  // Deactivation is now handled through the service details page

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter services
  const filteredServices = services.filter(service => {
    // Category filter
    if (categoryFilter !== 'ALL' && service.serviceCategory !== categoryFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        service.name.toLowerCase().includes(query) ||
        (service.description && service.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Calculate statistics
  const stats = {
    total: services.length,
    withGingrId: services.filter(s => s.externalId).length,
    withoutPrice: services.filter(s => s.price === 0).length,
    byCategory: services.reduce((acc, s) => {
      acc[s.serviceCategory] = (acc[s.serviceCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Typography>Loading services...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Services
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddService}
          >
            Add Service
          </Button>
        </Box>

        {/* Statistics Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="textSecondary">Total Services</Typography>
            <Typography variant="h4">{stats.total}</Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon color="primary" />
              <Box>
                <Typography variant="body2" color="textSecondary">Linked to Gingr</Typography>
                <Typography variant="h4">{stats.withGingrId}</Typography>
              </Box>
            </Box>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              <Box>
                <Typography variant="body2" color="textSecondary">Need Pricing</Typography>
                <Typography variant="h4">{stats.withoutPrice}</Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <ToggleButtonGroup
              value={categoryFilter}
              exclusive
              onChange={(_, value) => value && setCategoryFilter(value)}
              size="small"
            >
              <ToggleButton value="ALL">
                All ({stats.total})
              </ToggleButton>
              <ToggleButton value="BOARDING">
                Boarding ({stats.byCategory.BOARDING || 0})
              </ToggleButton>
              <ToggleButton value="DAYCARE">
                Daycare ({stats.byCategory.DAYCARE || 0})
              </ToggleButton>
              <ToggleButton value="GROOMING">
                Grooming ({stats.byCategory.GROOMING || 0})
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Gingr</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                      No services found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={service.serviceCategory}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{service.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={`$${service.price}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(() => {
                        const hours = Math.floor(service.duration / 60);
                        const minutes = service.duration % 60;
                        
                        if (hours === 0 && minutes === 0) return '0m';
                        if (hours === 0) return `${minutes}m`;
                        if (minutes === 0) return `${hours}h`;
                        return `${hours}h ${minutes}m`;
                      })()}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={service.externalId ? `Gingr ID: ${service.externalId}` : 'Not linked to Gingr'}>
                      {service.externalId ? (
                        <LinkIcon color="primary" fontSize="small" />
                      ) : (
                        <LinkOffIcon color="disabled" fontSize="small" />
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={service.isActive ? 'Active' : 'Inactive'}
                      color={service.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditService(service.id)}
                      aria-label="edit"
                      title="Edit service"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(service)}
                      aria-label="delete"
                      title="Delete service"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Delete Service</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {serviceToDelete?.name}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Services;
