/**
 * KennelSelection - Step for selecting kennel size (for boarding services)
 * Shows available kennel sizes with pricing
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Hotel as KennelIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { resourceService } from '../../../services/resourceService';

interface KennelOption {
  type: string;
  name: string;
  description: string;
  price: number;
  available: number;
}

interface KennelSelectionProps {
  bookingData: any;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (data: any) => void;
}

// Kennel size options with display info
const KENNEL_OPTIONS: KennelOption[] = [
  {
    type: 'JUNIOR_KENNEL',
    name: 'Junior Suite',
    description: 'Perfect for small dogs under 25 lbs',
    price: 45,
    available: 0,
  },
  {
    type: 'QUEEN_KENNEL',
    name: 'Queen Suite',
    description: 'Ideal for medium dogs 25-50 lbs',
    price: 55,
    available: 0,
  },
  {
    type: 'KING_KENNEL',
    name: 'King Suite',
    description: 'Spacious room for large dogs 50+ lbs',
    price: 65,
    available: 0,
  },
  {
    type: 'VIP_ROOM',
    name: 'VIP Suite',
    description: 'Luxury suite with extra amenities',
    price: 85,
    available: 0,
  },
];

const KennelSelection: React.FC<KennelSelectionProps> = ({
  bookingData,
  onNext,
  onBack,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kennelOptions, setKennelOptions] =
    useState<KennelOption[]>(KENNEL_OPTIONS);
  const [selectedKennel, setSelectedKennel] = useState<string>(
    bookingData.resourceType || ''
  );

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);

      // Get all resources to check availability
      const response = await resourceService.getAllResources();
      const resources = response.data || [];

      // Count available kennels by type
      const availabilityMap: Record<string, number> = {};
      resources.forEach((resource: any) => {
        const type = resource.type;
        if (type && resource.isActive) {
          availabilityMap[type] = (availabilityMap[type] || 0) + 1;
        }
      });

      // Update kennel options with availability counts
      const updatedOptions = KENNEL_OPTIONS.map((option) => ({
        ...option,
        available: availabilityMap[option.type] || 0,
      }));

      setKennelOptions(updatedOptions);
      setError('');
    } catch (err: any) {
      console.error('Error loading kennel availability:', err);
      setError('Unable to load kennel availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKennelSelect = (kennelType: string) => {
    setSelectedKennel(kennelType);
    const selected = kennelOptions.find((k) => k.type === kennelType);
    onUpdate({
      resourceType: kennelType,
      servicePrice: selected?.price || bookingData.servicePrice,
    });
  };

  const handleContinue = () => {
    if (!selectedKennel) {
      setError('Please select a kennel size');
      return;
    }
    onNext();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
          mb: 1,
        }}
      >
        Select Room Size
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose the best accommodation for your pet's size and comfort
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {kennelOptions.map((kennel) => (
          <Grid item xs={12} sm={6} key={kennel.type}>
            <Card
              elevation={selectedKennel === kennel.type ? 8 : 2}
              sx={{
                height: '100%',
                cursor: kennel.available > 0 ? 'pointer' : 'not-allowed',
                opacity: kennel.available > 0 ? 1 : 0.5,
                border:
                  selectedKennel === kennel.type ? '3px solid' : '1px solid',
                borderColor:
                  selectedKennel === kennel.type ? 'primary.main' : 'divider',
                transition: 'all 0.2s ease-in-out',
                '&:hover':
                  kennel.available > 0
                    ? {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                      }
                    : {},
              }}
              onClick={() =>
                kennel.available > 0 && handleKennelSelect(kennel.type)
              }
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: { xs: 48, sm: 56 },
                      height: { xs: 48, sm: 56 },
                      bgcolor:
                        selectedKennel === kennel.type
                          ? 'primary.main'
                          : 'grey.300',
                    }}
                  >
                    <KennelIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                          fontWeight: 600,
                        }}
                      >
                        {kennel.name}
                      </Typography>
                      {selectedKennel === kennel.type && (
                        <CheckCircleIcon color="primary" />
                      )}
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      }}
                    >
                      {kennel.description}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 1.5,
                      }}
                    >
                      <Typography
                        variant="h6"
                        color="primary"
                        fontWeight={700}
                        sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                      >
                        ${kennel.price}/night
                      </Typography>
                      <Chip
                        label={
                          kennel.available > 0
                            ? `${kennel.available} available`
                            : 'Sold out'
                        }
                        size="small"
                        color={kennel.available > 0 ? 'success' : 'error'}
                        variant="outlined"
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={!selectedKennel}
          endIcon={<ArrowForwardIcon />}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
};

export default KennelSelection;
