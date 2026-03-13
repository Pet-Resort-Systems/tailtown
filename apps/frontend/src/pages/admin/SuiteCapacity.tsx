/**
 * Suite Capacity Configuration Page
 * 
 * Admin interface for configuring multi-pet suite capacities
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Pets as PetsIcon
} from '@mui/icons-material';
import { multiPetService } from '../../services/multiPetService';
import {
  SuiteCapacityConfig,
  SuiteCapacity,
  SuiteCapacityType,
  MultiPetPricingType
} from '../../types/multiPet';

export const SuiteCapacityPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Configuration state
  const [config, setConfig] = useState<SuiteCapacityConfig | null>(null);
  const [capacities, setCapacities] = useState<SuiteCapacity[]>([]);

  // Dialog state
  const [showCapacityDialog, setShowCapacityDialog] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<SuiteCapacity | null>(null);

  // Form state
  const [capacityFormData, setCapacityFormData] = useState<Partial<SuiteCapacity>>({
    capacityType: 'DOUBLE',
    maxPets: 2,
    pricingType: 'PER_PET',
    basePrice: 50,
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configData, capacitiesData] = await Promise.all([
        multiPetService.getConfig(),
        multiPetService.getSuiteCapacities()
      ]);

      setConfig(configData);
      setCapacities(capacitiesData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load suite capacity configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;

    try {
      setError(null);
      const updated = await multiPetService.updateConfig(config);
      setConfig(updated);
      setSuccess('Configuration updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update configuration');
    }
  };

  const handleSaveCapacity = async () => {
    try {
      setError(null);

      const validation = multiPetService.validateCapacity(capacityFormData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      if (editingCapacity) {
        await multiPetService.updateSuiteCapacity(editingCapacity.id, capacityFormData);
      } else {
        await multiPetService.createSuiteCapacity(capacityFormData);
      }

      setShowCapacityDialog(false);
      setEditingCapacity(null);
      setCapacityFormData({
        capacityType: 'DOUBLE',
        maxPets: 2,
        pricingType: 'PER_PET',
        basePrice: 50,
        isActive: true
      });
      loadData();
      setSuccess('Suite capacity saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save suite capacity');
    }
  };

  const handleDeleteCapacity = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this suite capacity?')) return;

    try {
      await multiPetService.deleteSuiteCapacity(id);
      loadData();
      setSuccess('Suite capacity deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete suite capacity');
    }
  };

  const getCapacityTypeLabel = (type: SuiteCapacityType): string => {
    const labels: Record<SuiteCapacityType, string> = {
      SINGLE: 'Single (1 pet)',
      DOUBLE: 'Double (2 pets)',
      FAMILY: 'Family (3-4 pets)',
      GROUP: 'Group (5+ pets)',
      CUSTOM: 'Custom'
    };
    return labels[type];
  };

  const getPricingTypeLabel = (type: MultiPetPricingType): string => {
    const labels: Record<MultiPetPricingType, string> = {
      PER_PET: 'Per Pet',
      FLAT_RATE: 'Flat Rate',
      TIERED: 'Tiered Pricing',
      PERCENTAGE_OFF: 'Percentage Off'
    };
    return labels[type];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box>
        <Alert severity="error">Failed to load suite capacity configuration</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Multi-Pet Suite Capacity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure capacity and pricing for multi-pet bookings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingCapacity(null);
            setCapacityFormData({
              capacityType: 'DOUBLE',
              maxPets: 2,
              pricingType: 'PER_PET',
              basePrice: 50,
              isActive: true
            });
            setShowCapacityDialog(true);
          }}
        >
          Add Suite Capacity
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* General Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            General Settings
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.allowMultiplePets}
                    onChange={(e) => setConfig({ ...config, allowMultiplePets: e.target.checked })}
                  />
                }
                label="Allow Multiple Pets per Suite"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.requireSameOwner}
                    onChange={(e) => setConfig({ ...config, requireSameOwner: e.target.checked })}
                  />
                }
                label="Require Same Owner"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enableCompatibilityChecks}
                    onChange={(e) => setConfig({ ...config, enableCompatibilityChecks: e.target.checked })}
                  />
                }
                label="Enable Compatibility Checks"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.showOccupancyIndicators}
                    onChange={(e) => setConfig({ ...config, showOccupancyIndicators: e.target.checked })}
                  />
                }
                label="Show Occupancy Indicators"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleUpdateConfig}
              >
                Save Settings
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Suite Capacities */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Suite Capacities
          </Typography>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Suite Type</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Max Pets</TableCell>
                <TableCell>Pricing Type</TableCell>
                <TableCell>Base Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {capacities.map((capacity) => (
                <TableRow key={capacity.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {capacity.suiteType}
                    </Typography>
                  </TableCell>
                  <TableCell>{getCapacityTypeLabel(capacity.capacityType)}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<PetsIcon />}
                      label={capacity.maxPets}
                      size="small"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>{getPricingTypeLabel(capacity.pricingType)}</TableCell>
                  <TableCell>${capacity.basePrice}</TableCell>
                  <TableCell>
                    <Chip
                      label={capacity.isActive ? 'Active' : 'Inactive'}
                      color={capacity.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingCapacity(capacity);
                        setCapacityFormData(capacity);
                        setShowCapacityDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteCapacity(capacity.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {capacities.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                No suite capacities configured. Add your first capacity to get started.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Capacity Dialog */}
      <Dialog
        open={showCapacityDialog}
        onClose={() => setShowCapacityDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCapacity ? 'Edit Suite Capacity' : 'Add Suite Capacity'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Suite Type"
                value={capacityFormData.suiteType || ''}
                onChange={(e) => setCapacityFormData({ ...capacityFormData, suiteType: e.target.value })}
                helperText="e.g., STANDARD, DELUXE, LUXURY"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Capacity Type"
                value={capacityFormData.capacityType}
                onChange={(e) => setCapacityFormData({ ...capacityFormData, capacityType: e.target.value as SuiteCapacityType })}
              >
                <MenuItem value="SINGLE">Single (1 pet)</MenuItem>
                <MenuItem value="DOUBLE">Double (2 pets)</MenuItem>
                <MenuItem value="FAMILY">Family (3-4 pets)</MenuItem>
                <MenuItem value="GROUP">Group (5+ pets)</MenuItem>
                <MenuItem value="CUSTOM">Custom</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Pets"
                value={capacityFormData.maxPets || 1}
                onChange={(e) => setCapacityFormData({ ...capacityFormData, maxPets: parseInt(e.target.value) })}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Pricing Configuration
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Pricing Type"
                value={capacityFormData.pricingType}
                onChange={(e) => setCapacityFormData({ ...capacityFormData, pricingType: e.target.value as MultiPetPricingType })}
              >
                <MenuItem value="PER_PET">Per Pet</MenuItem>
                <MenuItem value="FLAT_RATE">Flat Rate</MenuItem>
                <MenuItem value="TIERED">Tiered Pricing</MenuItem>
                <MenuItem value="PERCENTAGE_OFF">Percentage Off</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Base Price ($)"
                value={capacityFormData.basePrice || 0}
                onChange={(e) => setCapacityFormData({ ...capacityFormData, basePrice: parseFloat(e.target.value) })}
              />
            </Grid>

            {capacityFormData.pricingType === 'PER_PET' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Additional Pet Price ($)"
                  value={capacityFormData.additionalPetPrice || 0}
                  onChange={(e) => setCapacityFormData({ ...capacityFormData, additionalPetPrice: parseFloat(e.target.value) })}
                  helperText="Price for each additional pet"
                />
              </Grid>
            )}

            {capacityFormData.pricingType === 'PERCENTAGE_OFF' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Additional Pet Price ($)"
                    value={capacityFormData.additionalPetPrice || 0}
                    onChange={(e) => setCapacityFormData({ ...capacityFormData, additionalPetPrice: parseFloat(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Percentage Off (%)"
                    value={capacityFormData.percentageOff || 0}
                    onChange={(e) => setCapacityFormData({ ...capacityFormData, percentageOff: parseFloat(e.target.value) })}
                    helperText="Discount for additional pets"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={capacityFormData.isActive}
                    onChange={(e) => setCapacityFormData({ ...capacityFormData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCapacityDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveCapacity} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuiteCapacityPage;
