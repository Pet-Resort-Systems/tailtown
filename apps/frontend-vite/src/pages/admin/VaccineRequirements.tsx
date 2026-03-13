import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import vaccineService from '../../services/vaccineService';
import {
  VaccineRequirement,
  CreateVaccineRequirementRequest,
  PET_TYPES,
  SERVICE_TYPES,
} from '../../types/vaccine';

const VaccineRequirements: React.FC = () => {
  const [requirements, setRequirements] = useState<VaccineRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<VaccineRequirement | null>(null);
  const [formData, setFormData] = useState<CreateVaccineRequirementRequest>({
    name: '',
    description: '',
    petType: undefined,
    serviceType: undefined,
    isRequired: true,
    validityPeriodMonths: 12,
    reminderDaysBefore: 30,
    isActive: true,
    displayOrder: 0,
    notes: '',
  });

  useEffect(() => {
    loadRequirements();
  }, []);

  const loadRequirements = async () => {
    try {
      setLoading(true);
      const data = await vaccineService.getAll();
      setRequirements(data);
      setError(null);
    } catch (err) {
      setError('Failed to load vaccine requirements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (requirement?: VaccineRequirement) => {
    if (requirement) {
      setEditingRequirement(requirement);
      setFormData({
        name: requirement.name,
        description: requirement.description || '',
        petType: requirement.petType === null ? undefined : requirement.petType,
        serviceType: requirement.serviceType === null ? undefined : requirement.serviceType,
        isRequired: requirement.isRequired,
        validityPeriodMonths: requirement.validityPeriodMonths,
        reminderDaysBefore: requirement.reminderDaysBefore,
        isActive: requirement.isActive,
        displayOrder: requirement.displayOrder,
        notes: requirement.notes || '',
      });
    } else {
      setEditingRequirement(null);
      setFormData({
        name: '',
        description: '',
        petType: undefined,
        serviceType: undefined,
        isRequired: true,
        validityPeriodMonths: 12,
        reminderDaysBefore: 30,
        isActive: true,
        displayOrder: requirements.length,
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRequirement(null);
  };

  const handleSave = async () => {
    try {
      // Convert undefined to null for proper JSON serialization
      const dataToSave = {
        ...formData,
        petType: formData.petType === undefined ? null : formData.petType,
        serviceType: formData.serviceType === undefined ? null : formData.serviceType,
      };
      
      if (editingRequirement) {
        await vaccineService.update(editingRequirement.id, dataToSave);
      } else {
        await vaccineService.create(dataToSave);
      }
      await loadRequirements();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || 'Failed to save vaccine requirement');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vaccine requirement?')) {
      try {
        await vaccineService.delete(id);
        await loadRequirements();
      } catch (err) {
        setError('Failed to delete vaccine requirement');
      }
    }
  };

  const handleToggleActive = async (requirement: VaccineRequirement) => {
    try {
      await vaccineService.update(requirement.id, {
        isActive: !requirement.isActive,
      });
      await loadRequirements();
    } catch (err) {
      setError('Failed to update vaccine requirement');
    }
  };

  const getPetTypeLabel = (petType?: string | null) => {
    if (!petType) return 'All Pets';
    return petType;
  };

  const getServiceTypeLabel = (serviceType?: string | null) => {
    if (!serviceType) return 'All Services';
    return serviceType;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Vaccine Requirements</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Requirement
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="40"></TableCell>
                <TableCell>Vaccine Name</TableCell>
                <TableCell>Pet Type</TableCell>
                <TableCell>Service Type</TableCell>
                <TableCell>Required</TableCell>
                <TableCell>Validity</TableCell>
                <TableCell>Reminder</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requirements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="textSecondary" py={4}>
                      No vaccine requirements found. Click "Add Requirement" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requirements.map((requirement) => (
                  <TableRow key={requirement.id}>
                    <TableCell>
                      <Tooltip title="Drag to reorder">
                        <DragIcon sx={{ cursor: 'move', color: 'text.secondary' }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {requirement.name}
                      </Typography>
                      {requirement.description && (
                        <Typography variant="caption" color="textSecondary">
                          {requirement.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPetTypeLabel(requirement.petType)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getServiceTypeLabel(requirement.serviceType)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={requirement.isRequired ? 'Required' : 'Optional'}
                        color={requirement.isRequired ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {requirement.validityPeriodMonths
                        ? `${requirement.validityPeriodMonths} months`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {requirement.reminderDaysBefore
                        ? `${requirement.reminderDaysBefore} days`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={requirement.isActive ? 'Active' : 'Inactive'}
                        color={requirement.isActive ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleActive(requirement)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(requirement)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(requirement.id)}
                        color="error"
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
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRequirement ? 'Edit Vaccine Requirement' : 'Add Vaccine Requirement'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Vaccine Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Pet Type</InputLabel>
                <Select
                  value={formData.petType || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      petType: (e.target.value || undefined) as 'DOG' | 'CAT' | undefined,
                    })
                  }
                  label="Pet Type"
                >
                  <MenuItem value="">All Pets</MenuItem>
                  {PET_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel shrink>Service Type</InputLabel>
                <Select
                  value={formData.serviceType ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceType: e.target.value === '' ? undefined : (e.target.value as 'BOARDING' | 'DAYCARE' | 'GROOMING'),
                    })
                  }
                  label="Service Type"
                  displayEmpty
                  notched
                  renderValue={(value) => {
                    if (!value) {
                      return 'All Services';
                    }
                    return value;
                  }}
                >
                  <MenuItem value="">All Services</MenuItem>
                  {SERVICE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Validity Period (months)"
                type="number"
                value={formData.validityPeriodMonths || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    validityPeriodMonths: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                fullWidth
              />

              <TextField
                label="Reminder Days Before"
                type="number"
                value={formData.reminderDaysBefore || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminderDaysBefore: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  />
                }
                label="Required"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Box>

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editingRequirement ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VaccineRequirements;
