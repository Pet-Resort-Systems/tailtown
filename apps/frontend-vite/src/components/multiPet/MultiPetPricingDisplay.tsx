/**
 * Multi-Pet Pricing Display Component
 *
 * Shows pricing breakdown for multi-pet bookings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Pets as PetsIcon,
  TrendingDown as SavingsIcon,
} from '@mui/icons-material';
import { multiPetService } from '../../services/multiPetService';
import {
  MultiPetPricingCalculation,
  SuiteCapacity,
} from '../../types/multiPet';
import { formatCurrency } from '../../utils/formatters';

interface MultiPetPricingDisplayProps {
  suiteCapacity: SuiteCapacity;
  numberOfPets: number;
  onPricingCalculated?: (calculation: MultiPetPricingCalculation) => void;
}

export const MultiPetPricingDisplay: React.FC<MultiPetPricingDisplayProps> = ({
  suiteCapacity,
  numberOfPets,
  onPricingCalculated,
}) => {
  const [calculation, setCalculation] =
    useState<MultiPetPricingCalculation | null>(null);

  useEffect(() => {
    if (numberOfPets > 0) {
      const result = multiPetService.calculatePricingLocal(
        suiteCapacity,
        numberOfPets
      );
      setCalculation(result);

      if (onPricingCalculated) {
        onPricingCalculated(result);
      }
    }
  }, [suiteCapacity, numberOfPets]);

  if (numberOfPets === 0) {
    return null;
  }

  if (!calculation) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center">
            <PetsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              {numberOfPets} Pet{numberOfPets > 1 ? 's' : ''}
            </Typography>
          </Box>
          <Typography variant="h5" color="primary">
            {formatCurrency(calculation.totalPrice)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {calculation.explanation}
        </Typography>

        {calculation.savings && calculation.savings > 0 && (
          <Alert
            severity="success"
            icon={<SavingsIcon />}
            sx={{ mt: 2, mb: 2 }}
          >
            <Typography variant="body2">
              <strong>Save {formatCurrency(calculation.savings)}</strong> (
              {calculation.savingsPercentage?.toFixed(0)}% off) compared to
              individual bookings!
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Pricing Breakdown
        </Typography>

        <List dense>
          {calculation.breakdown.map((item, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemText
                primary={item.description}
                secondary={item.petName}
              />
              <Typography variant="body2">
                {formatCurrency(item.amount)}
              </Typography>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 1 }} />

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={2}
        >
          <Typography variant="body2" color="text.secondary">
            Per Pet Average
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {formatCurrency(calculation.perPetCost)}
          </Typography>
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={1}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Total
          </Typography>
          <Typography variant="h6" color="primary">
            {formatCurrency(calculation.totalPrice)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MultiPetPricingDisplay;
