/**
 * Alternative Dates Component
 *
 * Shows alternative date suggestions when requested dates are unavailable.
 * Features:
 * - Sorted by proximity to requested dates
 * - Shows availability and pricing
 * - Highlights savings
 * - Click to select alternative
 */

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  CalendarToday as CalendarIcon,
  TrendingDown as SavingsIcon,
  CheckCircle as AvailableIcon,
} from "@mui/icons-material";
import { AlternativeDateSuggestion } from "../../types/availability";
import { availabilityService } from "../../services/availabilityService";
import { formatCurrency } from "../../utils/formatters";

interface AlternativeDatesProps {
  alternatives: AlternativeDateSuggestion[];
  requestedStartDate: string;
  requestedEndDate: string;
  onSelectAlternative: (alternative: AlternativeDateSuggestion) => void;
}

export const AlternativeDates: React.FC<AlternativeDatesProps> = ({
  alternatives,
  requestedStartDate,
  requestedEndDate,
  onSelectAlternative,
}) => {
  if (alternatives.length === 0) {
    return (
      <Alert severity="info">
        No alternative dates available at this time. Please try different dates
        or join the waitlist.
      </Alert>
    );
  }

  // Sort alternatives by relevance
  const sortedAlternatives = availabilityService.sortAlternatives(
    alternatives,
    requestedStartDate
  );

  const requestedRange = availabilityService.formatDateRange(
    requestedStartDate,
    requestedEndDate
  );

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Alternative Dates Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your requested dates ({requestedRange}) are not available. Here are
          some alternatives:
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {sortedAlternatives.map((alternative, index) => {
          const dateRange = availabilityService.formatDateRange(
            alternative.startDate,
            alternative.endDate
          );
          const nights = availabilityService.calculateNights(
            alternative.startDate,
            alternative.endDate
          );

          return (
            <Grid item xs={12} md={6} key={index}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  border: index === 0 ? 2 : 1,
                  borderColor: index === 0 ? "primary.main" : "divider",
                  position: "relative",
                }}
              >
                {index === 0 && (
                  <Chip
                    label="Best Match"
                    color="primary"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Date Range */}
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CalendarIcon color="primary" />
                    <Typography variant="h6">{dateRange}</Typography>
                  </Box>

                  {/* Nights */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {nights} night{nights !== 1 ? "s" : ""}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Availability */}
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AvailableIcon color="success" fontSize="small" />
                    <Typography variant="body2">
                      {alternative.availableCount} suite
                      {alternative.availableCount !== 1 ? "s" : ""} available
                    </Typography>
                  </Box>

                  {/* Price */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Total Price:
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(alternative.price)}
                    </Typography>
                  </Box>

                  {/* Savings */}
                  {alternative.savings && alternative.savings > 0 && (
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <SavingsIcon color="success" fontSize="small" />
                      <Typography variant="body2" color="success.main">
                        Save {formatCurrency(alternative.savings)}
                      </Typography>
                    </Box>
                  )}

                  {/* Reason */}
                  {alternative.reason && (
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary">
                        {alternative.reason}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    variant={index === 0 ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => onSelectAlternative(alternative)}
                  >
                    Select These Dates
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {sortedAlternatives.length > 4 && (
        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Showing {sortedAlternatives.length} alternative date options
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AlternativeDates;
