/**
 * PetSelection - Step 3: Select pets for booking
 * Shows only the logged-in customer's pets
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';
import { petService, Pet } from '../../../services/petService';

interface PetSelectionProps {
  bookingData: any;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (data: any) => void;
}

const PetSelection: React.FC<PetSelectionProps> = ({
  bookingData,
  onNext,
  onBack,
  onUpdate,
}) => {
  const { customer } = useCustomerAuth();
  const [error, setError] = useState('');
  const [customerPets, setCustomerPets] = useState<Pet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(
    bookingData.petIds || []
  );
  const [loadingPets, setLoadingPets] = useState(false);

  // Load customer's pets on mount
  useEffect(() => {
    if (customer) {
      loadCustomerPets(customer.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  // Load customer's pets
  const loadCustomerPets = async (customerId: string) => {
    try {
      setLoadingPets(true);
      const response = await petService.getPetsByCustomer(customerId);
      const pets = response.data || [];
      const activePets = pets.filter((pet: Pet) => pet.isActive);
      setCustomerPets(activePets);

      // Auto-select if customer has only one pet
      if (activePets.length === 1) {
        const petId = activePets[0].id;
        setSelectedPetIds([petId]);
        onUpdate({ petIds: [petId] });
      }

      setError('');
    } catch (err: any) {
      console.error('Error loading pets:', err);
      setError('Unable to load pets. Please try again.');
      setCustomerPets([]);
    } finally {
      setLoadingPets(false);
    }
  };

  // Toggle pet selection
  const handlePetToggle = (petId: string) => {
    setSelectedPetIds((prev) => {
      const newSelection = prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId];

      onUpdate({ petIds: newSelection });
      return newSelection;
    });
  };

  const handleContinue = () => {
    if (selectedPetIds.length === 0) {
      setError('Please select at least one pet');
      return;
    }
    onNext();
  };

  const getPetTypeIcon = (type: string) => {
    return type === 'DOG' ? '🐕' : type === 'CAT' ? '🐈' : '🐾';
  };

  return (
    <Box>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
          mb: 3,
        }}
      >
        Select Your Pets
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Customer Info */}
      {customer && (
        <Card
          sx={{
            mb: 3,
            bgcolor: 'primary.50',
            borderLeft: '4px solid',
            borderColor: 'primary.main',
          }}
        >
          <CardContent>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Booking for:
            </Typography>
            <Typography variant="h6">
              {customer.firstName} {customer.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {customer.email} • {customer.phone}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Pet Selection */}
      {customer && (
        <Box>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{ fontWeight: 600, mb: 2 }}
          >
            Select Pets ({selectedPetIds.length} selected)
          </Typography>

          {loadingPets ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : customerPets.length === 0 ? (
            <Alert severity="info">
              No active pets found for this customer. Please add pets to the
              customer account first.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {customerPets.map((pet) => (
                <Grid item xs={12} sm={6} md={4} key={pet.id}>
                  <Card
                    elevation={selectedPetIds.includes(pet.id) ? 8 : 2}
                    sx={{
                      height: '100%',
                      border: selectedPetIds.includes(pet.id)
                        ? '3px solid'
                        : '1px solid',
                      borderColor: selectedPetIds.includes(pet.id)
                        ? 'primary.main'
                        : 'divider',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handlePetToggle(pet.id)}
                      sx={{ height: '100%' }}
                    >
                      <CardContent>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                        >
                          <Avatar
                            sx={{
                              width: 56,
                              height: 56,
                              bgcolor: 'primary.main',
                              fontSize: '2rem',
                              mr: 2,
                            }}
                          >
                            {getPetTypeIcon(pet.type)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" component="h3">
                              {pet.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {pet.breed || pet.type}
                            </Typography>
                          </Box>
                          {selectedPetIds.includes(pet.id) && (
                            <CheckCircleIcon
                              color="primary"
                              sx={{ fontSize: 32 }}
                            />
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={pet.type}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          {pet.gender && (
                            <Chip
                              label={pet.gender}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {pet.weight && (
                            <Chip
                              label={`${pet.weight} lbs`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        {pet.specialNeeds && (
                          <Typography
                            variant="caption"
                            color="warning.main"
                            sx={{ display: 'block', mt: 1, fontWeight: 600 }}
                          >
                            ⚠️ Special needs
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Navigation Buttons - Fixed on mobile */}
      <Box
        sx={{
          position: { xs: 'fixed', sm: 'static' },
          bottom: { xs: 0, sm: 'auto' },
          left: { xs: 0, sm: 'auto' },
          right: { xs: 0, sm: 'auto' },
          p: { xs: 2, sm: 0 },
          mt: { xs: 0, sm: 4 },
          bgcolor: { xs: 'background.paper', sm: 'transparent' },
          boxShadow: { xs: '0 -2px 10px rgba(0,0,0,0.1)', sm: 'none' },
          zIndex: { xs: 1000, sm: 'auto' },
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant="outlined"
          size="large"
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          sx={{ py: { xs: 1.5, sm: 1.5 } }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleContinue}
          disabled={selectedPetIds.length === 0}
          endIcon={<ArrowForwardIcon />}
          sx={{ py: { xs: 1.5, sm: 1.5 } }}
        >
          Continue to Add-Ons
        </Button>
      </Box>

      {/* Spacer for fixed button on mobile */}
      {customer && (
        <Box sx={{ display: { xs: 'block', sm: 'none' }, height: 80 }} />
      )}
    </Box>
  );
};

export default PetSelection;
