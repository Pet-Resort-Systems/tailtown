/**
 * Modify Reservation Page
 *
 * Allows customers to modify their reservation:
 * - Change dates
 * - Add/remove pets
 * - Add/remove add-ons
 * - Preview price changes
 * - Confirm modifications
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Grid,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CalendarToday as CalendarIcon,
  Pets as PetsIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { reservationManagementService } from '../../services/reservationManagementService';
import { petService } from '../../services/petService';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import {
  ReservationDetails,
  ModifyReservationRequest,
  ModifyReservationResult,
  PriceAdjustment,
} from '../../types/reservationManagement';
import { Pet } from '../../types/pet';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const ModifyReservation: React.FC = () => {
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId: string }>();
  const { customer } = useCustomerAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<ReservationDetails | null>(
    null
  );
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);

  // Modification state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [modificationReason, setModificationReason] = useState('');

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [priceAdjustment, setPriceAdjustment] =
    useState<PriceAdjustment | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  // Result state
  const [modificationResult, setModificationResult] =
    useState<ModifyReservationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reservationId && customer?.id) {
      loadData();
    }
  }, [reservationId, customer]);

  const loadData = async () => {
    if (!reservationId || !customer?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load reservation details
      const resData =
        await reservationManagementService.getReservationDetails(reservationId);

      if (!resData.canModify) {
        setError('This reservation cannot be modified.');
      }

      setReservation(resData);
      setStartDate(resData.startDate.toString().split('T')[0]);
      setEndDate(resData.endDate.toString().split('T')[0]);
      setSelectedPetIds([resData.petId]);

      // Load customer's pets
      const petsData = await petService.getPetsByCustomer(customer.id);
      setAvailablePets(petsData.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to load reservation details'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewModification = async () => {
    if (!reservationId) return;

    try {
      setSubmitting(true);
      setError(null);

      const request: ModifyReservationRequest = {
        reservationId,
        modifications: {
          startDate:
            startDate !== reservation?.startDate.toString().split('T')[0]
              ? startDate
              : undefined,
          endDate:
            endDate !== reservation?.endDate.toString().split('T')[0]
              ? endDate
              : undefined,
          petIds: selectedPetIds.length > 1 ? selectedPetIds : undefined,
        },
        reason: modificationReason.trim() || undefined,
      };

      const preview =
        await reservationManagementService.previewModification(request);

      setPriceAdjustment(preview.priceAdjustment);
      setPreviewWarnings(preview.warnings);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to preview modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmModification = async () => {
    if (!reservationId) return;

    try {
      setSubmitting(true);
      setError(null);

      const request: ModifyReservationRequest = {
        reservationId,
        modifications: {
          startDate:
            startDate !== reservation?.startDate.toString().split('T')[0]
              ? startDate
              : undefined,
          endDate:
            endDate !== reservation?.endDate.toString().split('T')[0]
              ? endDate
              : undefined,
          petIds: selectedPetIds.length > 1 ? selectedPetIds : undefined,
        },
        reason: modificationReason.trim() || undefined,
      };

      const result =
        await reservationManagementService.modifyReservation(request);
      setModificationResult(result);
      setShowPreview(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to modify reservation');
      setShowPreview(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePet = (petId: string) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId]
    );
  };

  const hasChanges = () => {
    if (!reservation) return false;

    const dateChanged =
      startDate !== reservation.startDate.toString().split('T')[0] ||
      endDate !== reservation.endDate.toString().split('T')[0];

    const petsChanged =
      selectedPetIds.length !== 1 || selectedPetIds[0] !== reservation.petId;

    return dateChanged || petsChanged;
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !reservation) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/my-reservations')}
          sx={{ mt: 2 }}
        >
          Back to Reservations
        </Button>
      </Box>
    );
  }

  if (!reservation) {
    return (
      <Box p={3}>
        <Alert severity="error">Reservation not found</Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/my-reservations')}
          sx={{ mt: 2 }}
        >
          Back to Reservations
        </Button>
      </Box>
    );
  }

  // Success state
  if (modificationResult) {
    return (
      <Box>
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <SuccessIcon
                sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                Reservation Modified Successfully
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {modificationResult.message}
              </Typography>

              {modificationResult.priceDifference !== 0 && (
                <Paper
                  variant="outlined"
                  sx={{ p: 3, maxWidth: 400, mx: 'auto', my: 3 }}
                >
                  <Typography variant="h6" gutterBottom>
                    Price Adjustment
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography
                    variant="h4"
                    color={
                      modificationResult.priceDifference > 0
                        ? 'error.main'
                        : 'success.main'
                    }
                  >
                    {modificationResult.priceDifference > 0 ? '+' : ''}
                    {formatCurrency(modificationResult.priceDifference)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {modificationResult.priceDifference > 0
                      ? 'Additional payment required'
                      : 'Refund will be processed'}
                  </Typography>
                </Paper>
              )}

              <Stack spacing={2} direction="row" justifyContent="center" mt={3}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/my-reservations/${reservation.id}`)}
                >
                  View Details
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/my-reservations')}
                >
                  Back to Reservations
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(`/my-reservations/${reservationId}`)}
          sx={{ mb: 2 }}
        >
          Back to Details
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          Modify Reservation
        </Typography>
        {reservation.orderNumber && (
          <Typography variant="body2" color="text.secondary">
            Order #{reservation.orderNumber}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Info Alert */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          You can modify your reservation dates or add additional pets. Price
          adjustments will be calculated and shown before confirmation.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Modification Form */}
        <Grid item xs={12} md={8}>
          {/* Date Modification */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <CalendarIcon />
                <Typography variant="h6">Modify Dates</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Check-in Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: new Date().toISOString().split('T')[0],
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Current: {formatDate(reservation.startDate)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Check-out Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: startDate,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Current: {formatDate(reservation.endDate)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Pet Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <PetsIcon />
                <Typography variant="h6">Select Pets</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <FormGroup>
                {availablePets.map((pet) => (
                  <FormControlLabel
                    key={pet.id}
                    control={
                      <Checkbox
                        checked={selectedPetIds.includes(pet.id)}
                        onChange={() => handleTogglePet(pet.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">{pet.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pet.breed} • {pet.type}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>

              {selectedPetIds.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Please select at least one pet
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Reason */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reason for Modification (Optional)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason"
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                placeholder="Please provide a reason for the modification..."
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Sidebar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Reservation
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Check-in
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(reservation.startDate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Check-out
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(reservation.endDate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pet
                  </Typography>
                  <Typography variant="body2">
                    {reservation.pet?.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Service
                  </Typography>
                  <Typography variant="body2">
                    {reservation.service?.name}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current Total
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(
                      (reservation.service?.price || 0) -
                        (reservation.discount || 0)
                    )}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handlePreviewModification}
                  disabled={
                    !hasChanges() || selectedPetIds.length === 0 || submitting
                  }
                >
                  {submitting ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Preview Changes'
                  )}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(`/my-reservations/${reservationId}`)}
                >
                  Cancel
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => !submitting && setShowPreview(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review Modifications</DialogTitle>
        <DialogContent>
          {priceAdjustment && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Price Adjustment
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}
              >
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Original Price:</Typography>
                    <Typography variant="body2">
                      {formatCurrency(priceAdjustment.originalPrice)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">New Price:</Typography>
                    <Typography variant="body2">
                      {formatCurrency(priceAdjustment.newPrice)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6">
                      {priceAdjustment.difference > 0
                        ? 'Additional Payment:'
                        : 'Refund:'}
                    </Typography>
                    <Typography
                      variant="h6"
                      color={
                        priceAdjustment.difference > 0
                          ? 'error.main'
                          : 'success.main'
                      }
                    >
                      {formatCurrency(Math.abs(priceAdjustment.difference))}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {previewWarnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {previewWarnings.map((warning, index) => (
                    <Typography key={index} variant="body2">
                      • {warning}
                    </Typography>
                  ))}
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary">
                Are you sure you want to proceed with these modifications?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmModification}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? (
              <CircularProgress size={24} />
            ) : (
              'Confirm Modification'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModifyReservation;
