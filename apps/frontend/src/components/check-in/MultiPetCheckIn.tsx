import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Button,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pets as PetsIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import checkInService from '../../services/checkInService';
import { customerService } from '../../services/customerService';

interface RoomPet {
  id: string;
  petId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  status: string;
  isCheckedIn: boolean;
  checkIn?: {
    id: string;
    checkInTime: string;
  };
}

interface Pet {
  id: string;
  name: string;
  breed?: string;
  profilePhoto?: string;
  petIcons?: string[];
}

interface MultiPetCheckInProps {
  reservationId: string;
  onSelectPets: (petIds: string[], reservationIds: string[]) => void;
  onSinglePetCheckIn: () => void;
}

const MultiPetCheckIn: React.FC<MultiPetCheckInProps> = ({
  reservationId,
  onSelectPets,
  onSinglePetCheckIn,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomPets, setRoomPets] = useState<RoomPet[]>([]);
  const [petDetails, setPetDetails] = useState<Map<string, Pet>>(new Map());
  const [selectedPets, setSelectedPets] = useState<Set<string>>(new Set());
  const [totalPets, setTotalPets] = useState(0);

  useEffect(() => {
    loadRoomPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  const loadRoomPets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await checkInService.getRoomPets(reservationId);
      const data = response.data;

      setRoomPets(data.reservations || []);
      setTotalPets(data.totalPets || 0);

      // Load pet details for each reservation
      const petMap = new Map<string, Pet>();
      for (const reservation of data.reservations || []) {
        if (reservation.petId && !petMap.has(reservation.petId)) {
          try {
            const pet = await customerService.getPetById(reservation.petId);
            petMap.set(reservation.petId, pet);
          } catch (err) {
            console.error(`Error loading pet ${reservation.petId}:`, err);
          }
        }
      }
      setPetDetails(petMap);

      // Pre-select pets that aren't checked in yet
      const uncheckedPets = new Set<string>();
      for (const reservation of data.reservations || []) {
        if (!reservation.isCheckedIn) {
          uncheckedPets.add(reservation.petId);
        }
      }
      setSelectedPets(uncheckedPets);
    } catch (err: any) {
      console.error('Error loading room pets:', err);
      setError(err.message || 'Failed to load room pets');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePet = (petId: string) => {
    const newSelected = new Set(selectedPets);
    if (newSelected.has(petId)) {
      newSelected.delete(petId);
    } else {
      newSelected.add(petId);
    }
    setSelectedPets(newSelected);
  };

  const handleSelectAll = () => {
    const uncheckedPetIds = roomPets
      .filter((r) => !r.isCheckedIn)
      .map((r) => r.petId);
    setSelectedPets(new Set(uncheckedPetIds));
  };

  const handleDeselectAll = () => {
    setSelectedPets(new Set());
  };

  const handleProceed = () => {
    const selectedReservationIds = roomPets
      .filter((r) => selectedPets.has(r.petId))
      .map((r) => r.id);
    onSelectPets(Array.from(selectedPets), selectedReservationIds);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // If only one pet, skip multi-pet selection
  if (totalPets <= 1) {
    return null;
  }

  const uncheckedCount = roomPets.filter((r) => !r.isCheckedIn).length;
  const checkedInCount = roomPets.filter((r) => r.isCheckedIn).length;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">Multiple Pets in Room</Typography>
        <Chip
          label={`${totalPets} pets`}
          size="small"
          color="primary"
          sx={{ ml: 2 }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" paragraph>
        These pets are sharing the same room. You can check them in together or
        individually.
      </Typography>
      {checkedInCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {checkedInCount} pet(s) already checked in
        </Alert>
      )}
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={2}>
        {roomPets.map((reservation) => {
          const pet = petDetails.get(reservation.petId);
          const isCheckedIn = reservation.isCheckedIn;
          const isSelected = selectedPets.has(reservation.petId);

          return (
            <Grid
              key={reservation.id}
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Card
                variant="outlined"
                sx={{
                  opacity: isCheckedIn ? 0.7 : 1,
                  border: isSelected ? '2px solid' : '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  cursor: isCheckedIn ? 'default' : 'pointer',
                }}
                onClick={() =>
                  !isCheckedIn && handleTogglePet(reservation.petId)
                }
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar
                      src={pet?.profilePhoto}
                      sx={{ width: 48, height: 48, mr: 2 }}
                    >
                      <PetsIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {pet?.name || 'Unknown Pet'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pet?.breed || ''}
                      </Typography>
                    </Box>
                    {isCheckedIn && <CheckCircleIcon color="success" />}
                  </Box>
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  {isCheckedIn ? (
                    <Chip
                      label="Already Checked In"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ) : (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleTogglePet(reservation.petId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                      label="Include in check-in"
                    />
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Button size="small" onClick={handleSelectAll} sx={{ mr: 1 }}>
            Select All
          </Button>
          <Button size="small" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </Box>
        <Box>
          <Button
            variant="outlined"
            onClick={onSinglePetCheckIn}
            sx={{ mr: 2 }}
          >
            Check In Single Pet
          </Button>
          <Button
            variant="contained"
            onClick={handleProceed}
            disabled={selectedPets.size === 0}
          >
            Check In {selectedPets.size} Pet{selectedPets.size !== 1 ? 's' : ''}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default MultiPetCheckIn;
