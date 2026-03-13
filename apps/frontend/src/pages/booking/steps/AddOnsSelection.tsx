/**
 * AddOnsSelection - Step 4: Select optional add-ons
 * Mobile-optimized add-on selection with pricing
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import addonService, { AddOnService } from '../../../services/addonService';

interface AddOnsSelectionProps {
  bookingData: any;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (data: any) => void;
}

const AddOnsSelection: React.FC<AddOnsSelectionProps> = ({
  bookingData,
  onNext,
  onBack,
  onUpdate
}) => {
  const [addOns, setAddOns] = useState<AddOnService[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(bookingData.addOnIds || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadAddOns();
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [bookingData.serviceId]);

  const loadAddOns = async () => {
    try {
      setLoading(true);
      // Load add-ons for the selected service
      const data = await addonService.getAllAddOns(bookingData.serviceId);
      setAddOns(data.filter(addon => addon.isActive));
      setError('');
    } catch (err: any) {
      console.error('Error loading add-ons:', err);
      setError('Unable to load add-ons. You can skip this step.');
      setAddOns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAddOn = (addOnId: string) => {
    setSelectedAddOns(prev => {
      const newSelection = prev.includes(addOnId)
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId];
      
      // Calculate total add-on price
      const selectedAddOnObjects = addOns.filter(addon => newSelection.includes(addon.id));
      const addOnTotal = selectedAddOnObjects.reduce((sum, addon) => sum + addon.price, 0);
      
      onUpdate({ 
        addOnIds: newSelection,
        addOnTotal 
      });
      
      return newSelection;
    });
  };

  const handleContinue = () => {
    onNext();
  };

  const handleSkip = () => {
    onUpdate({ addOnIds: [], addOnTotal: 0 });
    onNext();
  };

  const calculateTotal = () => {
    return addOns
      .filter(addon => selectedAddOns.includes(addon.id))
      .reduce((sum, addon) => sum + addon.price, 0);
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
          mb: 3
        }}
      >
        Add-Ons & Extras
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Enhance your pet's stay with these optional services
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : addOns.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No add-ons available for this service. Click continue to proceed.
        </Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            {addOns.map((addon) => (
              <Grid item xs={12} sm={6} md={4} key={addon.id}>
                <Card
                  elevation={selectedAddOns.includes(addon.id) ? 8 : 2}
                  sx={{
                    height: '100%',
                    border: selectedAddOns.includes(addon.id)
                      ? '3px solid'
                      : '1px solid',
                    borderColor: selectedAddOns.includes(addon.id)
                      ? 'primary.main'
                      : 'divider',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => handleToggleAddOn(addon.id)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography 
                          variant="h6" 
                          component="h3"
                          sx={{ 
                            fontSize: { xs: '1rem', sm: '1.125rem' },
                            fontWeight: 600,
                            flex: 1
                          }}
                        >
                          {addon.name}
                        </Typography>
                        {selectedAddOns.includes(addon.id) && (
                          <CheckCircleIcon color="primary" sx={{ ml: 1 }} />
                        )}
                      </Box>

                      {addon.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ mb: 2, minHeight: 40 }}
                        >
                          {addon.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={`+$${addon.price.toFixed(2)}`}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        {addon.duration && (
                          <Chip
                            label={`${addon.duration} min`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Selected Add-Ons Summary */}
          {selectedAddOns.length > 0 && (
            <Card sx={{ mt: 3, bgcolor: 'primary.50', borderLeft: '4px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Selected Add-Ons ({selectedAddOns.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {addOns
                    .filter(addon => selectedAddOns.includes(addon.id))
                    .map(addon => (
                      <Chip
                        key={addon.id}
                        label={`${addon.name} - $${addon.price.toFixed(2)}`}
                        onDelete={() => handleToggleAddOn(addon.id)}
                        color="primary"
                      />
                    ))}
                </Box>
                <Typography variant="h6" color="primary">
                  Add-Ons Total: ${calculateTotal().toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
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
          gap: 2
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
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {addOns.length > 0 && (
            <Button
              variant="outlined"
              size="large"
              onClick={handleSkip}
              sx={{ py: { xs: 1.5, sm: 1.5 } }}
            >
              Skip
            </Button>
          )}
          <Button
            variant="contained"
            size="large"
            onClick={handleContinue}
            endIcon={<ArrowForwardIcon />}
            sx={{ py: { xs: 1.5, sm: 1.5 } }}
          >
            Continue
          </Button>
        </Box>
      </Box>

      {/* Spacer for fixed button on mobile */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, height: 80 }} />
    </Box>
  );
};

export default AddOnsSelection;
