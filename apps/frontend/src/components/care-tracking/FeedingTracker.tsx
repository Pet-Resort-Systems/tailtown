/**
 * Feeding Tracker Component
 * Mobile-friendly interface for staff to log pet feeding at each meal
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Restaurant as FoodIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Warning as PickyIcon,
  Check as CheckIcon,
  Pets as PetIcon,
} from '@mui/icons-material';
import careTrackingService, {
  CheckedInPet,
  MealTime,
} from '../../services/careTrackingService';

interface FeedingTrackerProps {
  onComplete?: () => void;
}

const MEAL_TIMES: { value: MealTime; label: string; icon: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast', icon: '🌅' },
  { value: 'LUNCH', label: 'Lunch', icon: '☀️' },
  { value: 'DINNER', label: 'Dinner', icon: '🌙' },
  { value: 'SNACK', label: 'Snack', icon: '🍪' },
];

const RATINGS = [
  { value: 0, label: "Didn't eat", emoji: '😔', color: '#f44336' },
  { value: 1, label: 'Ate a little', emoji: '😕', color: '#ff9800' },
  { value: 2, label: 'Ate half', emoji: '😐', color: '#2196f3' },
  { value: 3, label: 'Ate most', emoji: '🙂', color: '#8bc34a' },
  { value: 4, label: 'Ate all!', emoji: '😋', color: '#4caf50' },
];

const FeedingTracker: React.FC<FeedingTrackerProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pets, setPets] = useState<CheckedInPet[]>([]);
  const [selectedMealTime, setSelectedMealTime] =
    useState<MealTime>('BREAKFAST');
  const [expandedPet, setExpandedPet] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Determine current meal time based on hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 10) setSelectedMealTime('BREAKFAST');
    else if (hour < 14) setSelectedMealTime('LUNCH');
    else if (hour < 18) setSelectedMealTime('DINNER');
    else setSelectedMealTime('SNACK');
  }, []);

  // Load checked-in pets
  useEffect(() => {
    const loadPets = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await careTrackingService.getCheckedInPets();
        setPets(data);
      } catch (err: any) {
        console.error('Error loading pets:', err);
        setError('Failed to load pets');
      } finally {
        setLoading(false);
      }
    };
    loadPets();
  }, []);

  const handleRatingSelect = async (
    petId: string,
    reservationId: string,
    rating: number
  ) => {
    try {
      setSaving(petId);
      setError(null);

      await careTrackingService.createFeedingLog({
        petId,
        reservationId,
        mealTime: selectedMealTime,
        rating,
        notes: notes[petId],
      });

      // Update local state
      setPets((prev) =>
        prev.map((p) => {
          if (p.pet.id === petId) {
            const existingLogs = p.todaysFeedingLogs || [];
            const filteredLogs = existingLogs.filter(
              (l) => l.mealTime !== selectedMealTime
            );
            return {
              ...p,
              todaysFeedingLogs: [
                ...filteredLogs,
                {
                  id: 'temp',
                  tenantId: '',
                  petId,
                  date: new Date().toISOString(),
                  mealTime: selectedMealTime,
                  rating,
                  notes: notes[petId],
                  staffId: '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            };
          }
          return p;
        })
      );

      setSuccess(
        `Logged ${careTrackingService.formatMealTime(selectedMealTime)} for ${
          pets.find((p) => p.pet.id === petId)?.pet.name
        }`
      );
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error logging feeding:', err);
      setError('Failed to log feeding');
    } finally {
      setSaving(null);
    }
  };

  const getCurrentRating = (pet: CheckedInPet): number | null => {
    const log = pet.todaysFeedingLogs?.find(
      (l) => l.mealTime === selectedMealTime
    );
    return log ? log.rating : null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FoodIcon color="primary" />
        <Typography variant="h5">Feeding Tracker</Typography>
      </Box>

      {/* Meal Time Selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Select Meal Time
        </Typography>
        <ToggleButtonGroup
          value={selectedMealTime}
          exclusive
          onChange={(_, value) => value && setSelectedMealTime(value)}
          fullWidth
          size="large"
        >
          {MEAL_TIMES.map((meal) => (
            <ToggleButton key={meal.value} value={meal.value}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{meal.icon}</span>
                <Typography variant="caption">{meal.label}</Typography>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Pet List */}
      {pets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PetIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">
            No pets currently checked in
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {pets.map((petData) => {
            const currentRating = getCurrentRating(petData);
            const isExpanded = expandedPet === petData.pet.id;

            return (
              <Card key={petData.pet.id} elevation={2}>
                <CardContent sx={{ pb: 1 }}>
                  {/* Pet Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Avatar
                      src={petData.pet.profilePhoto}
                      sx={{ width: 56, height: 56, bgcolor: 'primary.light' }}
                    >
                      <PetIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Typography variant="h6">{petData.pet.name}</Typography>
                        {petData.pet.isPickyEater && (
                          <Chip
                            icon={<PickyIcon />}
                            label="Picky"
                            size="small"
                            color="warning"
                          />
                        )}
                        {currentRating !== null && (
                          <Chip
                            icon={<CheckIcon />}
                            label="Logged"
                            size="small"
                            color="success"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {petData.pet.breed} • {petData.customer.firstName}{' '}
                        {petData.customer.lastName}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() =>
                        setExpandedPet(isExpanded ? null : petData.pet.id)
                      }
                    >
                      {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                  </Box>

                  {/* Food Notes */}
                  {petData.pet.foodNotes && (
                    <Alert severity="info" sx={{ mb: 2, py: 0 }}>
                      <Typography variant="body2">
                        {petData.pet.foodNotes}
                      </Typography>
                    </Alert>
                  )}

                  {/* Rating Buttons */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    {RATINGS.map((r) => (
                      <Button
                        key={r.value}
                        variant={
                          currentRating === r.value ? 'contained' : 'outlined'
                        }
                        onClick={() =>
                          handleRatingSelect(
                            petData.pet.id,
                            petData.reservationId,
                            r.value
                          )
                        }
                        disabled={saving === petData.pet.id}
                        sx={{
                          minWidth: 60,
                          flexDirection: 'column',
                          py: 1,
                          borderColor: r.color,
                          color: currentRating === r.value ? 'white' : r.color,
                          bgcolor:
                            currentRating === r.value ? r.color : 'transparent',
                          '&:hover': {
                            bgcolor:
                              currentRating === r.value
                                ? r.color
                                : `${r.color}20`,
                          },
                        }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>{r.emoji}</span>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: '0.65rem' }}
                        >
                          {r.value}
                        </Typography>
                      </Button>
                    ))}
                  </Box>

                  {/* Expanded Section */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 2 }} />
                    <TextField
                      label="Notes (optional)"
                      value={notes[petData.pet.id] || ''}
                      onChange={(e) =>
                        setNotes({ ...notes, [petData.pet.id]: e.target.value })
                      }
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      placeholder="Any notes about this meal..."
                    />

                    {/* Today's Logs */}
                    {petData.todaysFeedingLogs &&
                      petData.todaysFeedingLogs.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Today's Logs
                          </Typography>
                          <Box
                            sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
                          >
                            {petData.todaysFeedingLogs.map((log) => (
                              <Chip
                                key={log.id}
                                label={`${careTrackingService.formatMealTime(
                                  log.mealTime
                                )}: ${RATINGS[log.rating]?.emoji}`}
                                size="small"
                                sx={{
                                  bgcolor: RATINGS[log.rating]?.color + '30',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Complete Button */}
      {onComplete && pets.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button variant="contained" size="large" onClick={onComplete}>
            Done with {careTrackingService.formatMealTime(selectedMealTime)}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FeedingTracker;
