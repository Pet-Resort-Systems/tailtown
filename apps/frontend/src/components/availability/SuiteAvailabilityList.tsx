/**
 * Suite Availability List Component
 * 
 * Displays available suites for a date range with:
 * - Availability status
 * - Conflicting reservations
 * - Next available date
 * - Suite details
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import {
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { SuiteAvailability } from '../../types/availability';
import { formatDate } from '../../utils/formatters';

interface SuiteAvailabilityListProps {
  suites: SuiteAvailability[];
  onSuiteSelect?: (suiteId: string) => void;
  selectedSuiteId?: string;
}

export const SuiteAvailabilityList: React.FC<SuiteAvailabilityListProps> = ({
  suites,
  onSuiteSelect,
  selectedSuiteId
}) => {
  if (suites.length === 0) {
    return (
      <Alert severity="info" icon={<InfoIcon />}>
        No suites match your search criteria. Try different dates or suite types.
      </Alert>
    );
  }

  const availableSuites = suites.filter(s => s.isAvailable);
  const unavailableSuites = suites.filter(s => !s.isAvailable);

  return (
    <Box>
      {/* Available Suites */}
      {availableSuites.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Available Suites ({availableSuites.length})
          </Typography>
          <List>
            {availableSuites.map((suite, index) => (
              <React.Fragment key={suite.suiteId}>
                <ListItem
                  component={onSuiteSelect ? "button" : "div"}
                  onClick={() => onSuiteSelect && onSuiteSelect(suite.suiteId)}
                  selected={selectedSuiteId === suite.suiteId}
                  sx={{
                    border: selectedSuiteId === suite.suiteId ? 2 : 1,
                    borderColor: selectedSuiteId === suite.suiteId ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <AvailableIcon color="success" sx={{ mr: 2 }} />
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {suite.suiteName}
                        </Typography>
                        <Chip
                          label={suite.suiteType}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Capacity: {suite.capacity} pet{suite.capacity !== 1 ? 's' : ''}
                      </Typography>
                    }
                  />
                  <Chip label="Available" color="success" size="small" />
                </ListItem>
                {index < availableSuites.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {/* Unavailable Suites */}
      {unavailableSuites.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom color="text.secondary">
            Unavailable Suites ({unavailableSuites.length})
          </Typography>
          <List>
            {unavailableSuites.map((suite, index) => (
              <React.Fragment key={suite.suiteId}>
                <Card variant="outlined" sx={{ mb: 1, opacity: 0.7 }}>
                  <CardContent>
                    <Box display="flex" alignItems="flex-start" gap={2}>
                      <UnavailableIcon color="error" />
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {suite.suiteName}
                          </Typography>
                          <Chip
                            label={suite.suiteType}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Capacity: {suite.capacity} pet{suite.capacity !== 1 ? 's' : ''}
                        </Typography>

                        {suite.conflictingReservations && suite.conflictingReservations.length > 0 && (
                          <Box mt={1}>
                            <Typography variant="caption" color="error" display="block" gutterBottom>
                              Conflicting Reservations:
                            </Typography>
                            {suite.conflictingReservations.map((reservation, idx) => (
                              <Typography key={idx} variant="caption" display="block" color="text.secondary">
                                • {reservation.petName}: {formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}
                              </Typography>
                            ))}
                          </Box>
                        )}

                        {suite.nextAvailableDate && (
                          <Box mt={1}>
                            <Chip
                              label={`Next available: ${formatDate(suite.nextAvailableDate)}`}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {index < unavailableSuites.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default SuiteAvailabilityList;
