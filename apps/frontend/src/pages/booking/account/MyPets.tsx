/**
 * MyPets - View and update pet information
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Pets as PetsIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';
import customerAccountService, {
  CustomerPet,
} from '../../../services/customerAccountService';

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const GENDER_OPTIONS = ['Male', 'Female', 'Unknown'];

const MyPets: React.FC = () => {
  const { customer } = useCustomerAuth();
  const [pets, setPets] = useState<CustomerPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<CustomerPet | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomerPet>>({});

  const loadPets = useCallback(async () => {
    if (!customer?.id) return;

    try {
      setLoading(true);
      setError('');
      const data = await customerAccountService.getCustomerPets(customer.id);
      setPets(data.filter((p) => p.isActive));
    } catch (err: any) {
      console.error('Error loading pets:', err);
      setError('Unable to load pets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  const handleEditClick = (pet: CustomerPet) => {
    setSelectedPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      color: pet.color,
      weight: pet.weight,
      birthDate: pet.birthDate,
      gender: pet.gender,
      notes: pet.notes,
      feedingInstructions: pet.feedingInstructions,
      medicationInstructions: pet.medicationInstructions,
    });
    setEditDialogOpen(true);
  };

  const handleAddClick = () => {
    setSelectedPet(null);
    setFormData({
      name: '',
      species: 'Dog',
      breed: '',
      color: '',
      gender: 'Unknown',
      notes: '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (selectedPet) {
        // Update existing pet
        await customerAccountService.updatePet(selectedPet.id, formData);
      } else {
        // Add new pet
        await customerAccountService.addPet(customer!.id, {
          ...formData,
          isActive: true,
        });
      }

      setEditDialogOpen(false);
      loadPets();
    } catch (err: any) {
      setError('Unable to save pet information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          My Pets ({pets.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Add Pet
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {pets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <PetsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Pets Added Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your pets to make booking faster and easier.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Add Your First Pet
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {pets.map((pet) => (
            <Grid
              key={pet.id}
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={pet.photoUrl}
                      sx={{
                        width: 56,
                        height: 56,
                        mr: 2,
                        bgcolor: 'primary.light',
                      }}
                    >
                      <PetsIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {pet.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pet.breed || pet.species}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => handleEditClick(pet)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>

                  <Box
                    sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}
                  >
                    <Chip size="small" label={pet.species} variant="outlined" />
                    {pet.gender && pet.gender !== 'Unknown' && (
                      <Chip
                        size="small"
                        icon={
                          pet.gender === 'Male' ? <MaleIcon /> : <FemaleIcon />
                        }
                        label={pet.gender}
                        variant="outlined"
                      />
                    )}
                    {pet.weight && (
                      <Chip
                        size="small"
                        label={`${pet.weight} lbs`}
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {pet.birthDate && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Born: {format(parseISO(pet.birthDate), 'MMM d, yyyy')}
                    </Typography>
                  )}

                  {pet.notes && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      {pet.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {/* Edit/Add Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedPet ? `Edit ${selectedPet.name}` : 'Add New Pet'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Pet Name"
                fullWidth
                required
                value={formData.name || ''}
                onChange={handleFormChange('name')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Species"
                fullWidth
                select
                value={formData.species || 'Dog'}
                onChange={handleFormChange('species')}
              >
                {SPECIES_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Breed"
                fullWidth
                value={formData.breed || ''}
                onChange={handleFormChange('breed')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Color"
                fullWidth
                value={formData.color || ''}
                onChange={handleFormChange('color')}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Gender"
                fullWidth
                select
                value={formData.gender || 'Unknown'}
                onChange={handleFormChange('gender')}
              >
                {GENDER_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Weight (lbs)"
                fullWidth
                type="number"
                value={formData.weight || ''}
                onChange={handleFormChange('weight')}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Birth Date"
                fullWidth
                type="date"
                value={
                  formData.birthDate ? formData.birthDate.split('T')[0] : ''
                }
                onChange={handleFormChange('birthDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                value={formData.notes || ''}
                onChange={handleFormChange('notes')}
                placeholder="Any special notes about your pet"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Feeding Instructions"
                fullWidth
                multiline
                rows={2}
                value={formData.feedingInstructions || ''}
                onChange={handleFormChange('feedingInstructions')}
                placeholder="Special feeding requirements"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Medication Instructions"
                fullWidth
                multiline
                rows={2}
                value={formData.medicationInstructions || ''}
                onChange={handleFormChange('medicationInstructions')}
                placeholder="Any medications your pet needs"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.name}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyPets;
