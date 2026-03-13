/**
 * Deposit Information Component
 * 
 * Displays deposit requirements and refund policy to customers
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Event as EventIcon,
  Policy as PolicyIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { depositService } from '../../services/depositService';
import { DepositCalculation } from '../../types/deposit';
import { formatCurrency } from '../../utils/formatters';

interface DepositInfoProps {
  totalCost: number;
  startDate: string;
  endDate: string;
  serviceId?: string;
  isFirstTimeCustomer?: boolean;
  onDepositCalculated?: (calculation: DepositCalculation) => void;
}

export const DepositInfo: React.FC<DepositInfoProps> = ({
  totalCost,
  startDate,
  endDate,
  serviceId,
  isFirstTimeCustomer,
  onDepositCalculated
}) => {
  const [loading, setLoading] = useState(true);
  const [calculation, setCalculation] = useState<DepositCalculation | null>(null);

  useEffect(() => {
    calculateDeposit();
  }, [totalCost, startDate, endDate, serviceId]);

  const calculateDeposit = async () => {
    try {
      setLoading(true);

      const result = await depositService.calculateDeposit({
        totalCost,
        startDate,
        endDate,
        serviceId
      });

      setCalculation(result);
      
      if (onDepositCalculated) {
        onDepositCalculated(result);
      }
    } catch (err) {
      console.error('Failed to calculate deposit:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!calculation) {
    return null;
  }

  if (!calculation.depositRequired) {
    return (
      <Alert severity="success" icon={<CheckIcon />}>
        <Typography variant="body2">
          <strong>No deposit required</strong> - Full payment due at check-in
        </Typography>
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Deposit Required</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {calculation.explanation}
          </Typography>
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Cost
              </Typography>
              <Typography variant="h6">
                {formatCurrency(calculation.totalCost)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Deposit Amount
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(calculation.depositAmount)}
              </Typography>
              {calculation.depositPercentage && (
                <Typography variant="caption" color="text.secondary">
                  ({calculation.depositPercentage}% of total)
                </Typography>
              )}
            </Box>
          </Grid>

          {calculation.depositDueDate && (
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" mt={1}>
                <EventIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Due by: {new Date(calculation.depositDueDate).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" alignItems="center" mb={1}>
          <PolicyIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="subtitle2">
            Refund Policy: {depositService.getRefundPolicyText(calculation.refundPolicy)}
          </Typography>
        </Box>

        {calculation.refundTiers && calculation.refundTiers.length > 0 && (
          <List dense>
            {calculation.refundTiers.map((tier, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={tier.description}
                  primaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {calculation.matchedRuleName && (
          <Box mt={2}>
            <Chip
              label={calculation.matchedRuleName}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DepositInfo;
