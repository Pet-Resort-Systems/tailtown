/**
 * Availability Checker Component
 *
 * Complete availability checking flow:
 * 1. Check availability for dates
 * 2. Show available suites
 * 3. Suggest alternatives if unavailable
 * 4. Offer waitlist option
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
} from '@mui/icons-material';
import { availabilityService } from '../../services/availabilityService';
import {
  AvailabilityCheckRequest,
  AvailabilityCheckResult,
  AlternativeDateSuggestion,
} from '../../types/availability';
import SuiteAvailabilityList from './SuiteAvailabilityList';
import AlternativeDates from './AlternativeDates';
import WaitlistDialog from './WaitlistDialog';

interface AvailabilityCheckerProps {
  serviceId: string;
  customerId?: string;
  onAvailabilityConfirmed?: (result: AvailabilityCheckResult) => void;
  onSuiteSelected?: (suiteId: string) => void;
}

export const AvailabilityChecker: React.FC<AvailabilityCheckerProps> = ({
  serviceId,
  customerId,
  onAvailabilityConfirmed,
  onSuiteSelected,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfPets, setNumberOfPets] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityCheckResult | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | undefined>();

  const handleCheckAvailability = async () => {
    // Validate dates
    const validation = availabilityService.validateDateRange(
      startDate,
      endDate
    );
    if (!validation.isValid) {
      setError(validation.error || 'Invalid date range');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const request: AvailabilityCheckRequest = {
        startDate,
        endDate,
        serviceId,
        numberOfPets,
      };

      const checkResult = await availabilityService.checkAvailability(request);
      setResult(checkResult);

      if (checkResult.isAvailable && onAvailabilityConfirmed) {
        onAvailabilityConfirmed(checkResult);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check availability');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternative = (alternative: AlternativeDateSuggestion) => {
    setStartDate(alternative.startDate);
    setEndDate(alternative.endDate);
    setResult(null);
    // Automatically check availability for selected alternative
    setTimeout(() => handleCheckAvailability(), 100);
  };

  const handleSuiteSelect = (suiteId: string) => {
    setSelectedSuiteId(suiteId);
    if (onSuiteSelected) {
      onSuiteSelected(suiteId);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const nights =
    startDate && endDate
      ? availabilityService.calculateNights(startDate, endDate)
      : 0;

  return (
    <Box>
      {/* Date Selection */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Check Availability
        </Typography>

        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3
            }}>
            <TextField
              fullWidth
              type="date"
              label="Check-in Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: getMinDate() }}
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3
            }}>
            <TextField
              fullWidth
              type="date"
              label="Check-out Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: startDate || getMinDate() }}
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3
            }}>
            <TextField
              fullWidth
              type="number"
              label="Number of Pets"
              value={numberOfPets}
              onChange={(e) => setNumberOfPets(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1, max: 10 }}
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3
            }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleCheckAvailability}
              disabled={loading || !startDate || !endDate}
              startIcon={
                loading ? <CircularProgress size={20} /> : <SearchIcon />
              }
              sx={{ height: '56px' }}
            >
              {loading ? 'Checking...' : 'Check Availability'}
            </Button>
          </Grid>
        </Grid>

        {nights > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            {nights} night{nights !== 1 ? 's' : ''}
          </Typography>
        )}
      </Paper>
      {/* Error */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {/* Results */}
      {result && (
        <Box>
          {/* Status Alert */}
          <Alert
            severity={result.isAvailable ? 'success' : 'warning'}
            icon={result.isAvailable ? <AvailableIcon /> : <UnavailableIcon />}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              {result.message}
            </Typography>
            {result.suggestions && result.suggestions.length > 0 && (
              <Box mt={1}>
                {result.suggestions.map((suggestion, index) => (
                  <Typography key={index} variant="body2">
                    • {suggestion}
                  </Typography>
                ))}
              </Box>
            )}
          </Alert>

          {/* Available Suites */}
          {result.isAvailable && result.availableSuites.length > 0 && (
            <Box mb={3}>
              <SuiteAvailabilityList
                suites={result.availableSuites}
                onSuiteSelect={handleSuiteSelect}
                selectedSuiteId={selectedSuiteId}
              />
            </Box>
          )}

          {/* Alternative Dates */}
          {!result.isAvailable &&
            result.alternativeDates &&
            result.alternativeDates.length > 0 && (
              <Box mb={3}>
                <AlternativeDates
                  alternatives={result.alternativeDates as any}
                  requestedStartDate={startDate}
                  requestedEndDate={endDate}
                  onSelectAlternative={handleSelectAlternative}
                />
              </Box>
            )}

          {/* Waitlist Option */}
          {!result.isAvailable && result.waitlistAvailable && customerId && (
            <Box textAlign="center" mt={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Don't see dates that work for you?
              </Typography>
              <Button variant="outlined" onClick={() => setShowWaitlist(true)}>
                Join Waitlist
              </Button>
              {result.estimatedWaitTime && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mt={1}
                >
                  Estimated wait time: {result.estimatedWaitTime} days
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}
      {/* Waitlist Dialog */}
      {customerId && (
        <WaitlistDialog
          open={showWaitlist}
          onClose={() => setShowWaitlist(false)}
          customerId={customerId}
          serviceId={serviceId}
          requestedStartDate={startDate}
          requestedEndDate={endDate}
          numberOfPets={numberOfPets}
        />
      )}
    </Box>
  );
};

export default AvailabilityChecker;
