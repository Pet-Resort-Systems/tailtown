/**
 * DaycarePasses - View and purchase daycare passes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  CardGiftcard as PassIcon,
  ShoppingCart as CartIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format, parseISO, isPast } from 'date-fns';
import { useCustomerAuth } from '../../../contexts/CustomerAuthContext';
import customerAccountService, {
  DaycarePass,
  DaycarePassType,
} from '../../../services/customerAccountService';

const DaycarePasses: React.FC = () => {
  const { customer } = useCustomerAuth();
  const [passes, setPasses] = useState<DaycarePass[]>([]);
  const [passTypes, setPassTypes] = useState<DaycarePassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedPassType, setSelectedPassType] =
    useState<DaycarePassType | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const loadData = useCallback(async () => {
    if (!customer?.id) return;

    try {
      setLoading(true);
      setError('');
      const [passesData, typesData] = await Promise.all([
        customerAccountService.getDaycarePasses(customer.id),
        customerAccountService.getAvailablePassTypes(),
      ]);
      setPasses(passesData);
      setPassTypes(typesData);
    } catch (err: any) {
      console.error('Error loading daycare passes:', err);
      setError('Unable to load daycare passes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePurchaseClick = (passType: DaycarePassType) => {
    setSelectedPassType(passType);
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseConfirm = async () => {
    if (!selectedPassType) return;

    try {
      setPurchasing(true);
      await customerAccountService.purchaseDaycarePass(
        customer!.id,
        selectedPassType.id
      );
      setPurchaseDialogOpen(false);
      setSelectedPassType(null);
      loadData(); // Refresh
    } catch (err: any) {
      setError('Unable to purchase pass. Please try again or contact us.');
    } finally {
      setPurchasing(false);
    }
  };

  const getPassStatus = (
    pass: DaycarePass
  ): { label: string; color: 'success' | 'warning' | 'error' } => {
    if (pass.remainingDays === 0) {
      return { label: 'Used', color: 'error' };
    }
    if (pass.expiresAt && isPast(parseISO(pass.expiresAt))) {
      return { label: 'Expired', color: 'error' };
    }
    if (pass.remainingDays <= 2) {
      return { label: 'Low Balance', color: 'warning' };
    }
    return { label: 'Active', color: 'success' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activePasses = passes.filter(
    (p) => p.status === 'ACTIVE' && p.remainingDays > 0
  );
  const expiredPasses = passes.filter(
    (p) => p.status !== 'ACTIVE' || p.remainingDays === 0
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Active Passes */}
      <Typography variant="h6" gutterBottom fontWeight={600}>
        My Daycare Passes
      </Typography>

      {activePasses.length === 0 ? (
        <Card variant="outlined" sx={{ mb: 4, textAlign: 'center', py: 4 }}>
          <PassIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No active daycare passes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Purchase a pass below to save on daycare visits!
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {activePasses.map((pass) => {
            const status = getPassStatus(pass);
            const usagePercent =
              ((pass.totalDays - pass.remainingDays) / pass.totalDays) * 100;

            return (
              <Grid item xs={12} sm={6} key={pass.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {pass.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Purchased{' '}
                          {format(parseISO(pass.purchasedAt), 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        icon={
                          status.color === 'success' ? (
                            <CheckIcon />
                          ) : (
                            <WarningIcon />
                          )
                        }
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Days Remaining
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {pass.remainingDays} / {pass.totalDays}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={usagePercent}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor:
                              status.color === 'success'
                                ? 'success.main'
                                : status.color === 'warning'
                                  ? 'warning.main'
                                  : 'error.main',
                          },
                        }}
                      />
                    </Box>

                    {pass.expiresAt && (
                      <Typography variant="caption" color="text.secondary">
                        Expires:{' '}
                        {format(parseISO(pass.expiresAt), 'MMM d, yyyy')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Available Passes for Purchase */}
      <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mt: 4 }}>
        Purchase a Pass
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Save money with our daycare pass packages!
      </Typography>

      {passTypes.length === 0 ? (
        <Alert severity="info">
          No daycare passes are currently available for purchase. Please check
          back later.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {passTypes.map((passType) => (
            <Grid item xs={12} sm={6} md={4} key={passType.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {passType.name}
                  </Typography>

                  <Typography
                    variant="h4"
                    color="primary"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    ${passType.price.toFixed(2)}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {passType.days} daycare visits
                    {passType.validityDays &&
                      ` • Valid for ${passType.validityDays} days`}
                  </Typography>

                  {passType.description && (
                    <Typography variant="body2" color="text.secondary">
                      {passType.description}
                    </Typography>
                  )}

                  <Typography
                    variant="caption"
                    color="success.main"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Save $
                    {(
                      (passType.price / passType.days) *
                      0.15 *
                      passType.days
                    ).toFixed(2)}{' '}
                    vs. daily rate
                  </Typography>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<CartIcon />}
                    onClick={() => handlePurchaseClick(passType)}
                  >
                    Purchase
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Expired/Used Passes */}
      {expiredPasses.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mt: 4 }}>
            Past Passes
          </Typography>
          <Grid container spacing={2}>
            {expiredPasses.slice(0, 4).map((pass) => (
              <Grid item xs={12} sm={6} key={pass.id}>
                <Card variant="outlined" sx={{ opacity: 0.7 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {pass.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pass.totalDays} days used
                        </Typography>
                      </Box>
                      <Chip label={pass.status} size="small" color="default" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Purchase Confirmation Dialog */}
      <Dialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Purchase</DialogTitle>
        <DialogContent>
          {selectedPassType && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <PassIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {selectedPassType.name}
              </Typography>
              <Typography variant="h4" color="primary" fontWeight={700}>
                ${selectedPassType.price.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {selectedPassType.days} daycare visits
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPurchaseDialogOpen(false)}
            disabled={purchasing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchaseConfirm}
            variant="contained"
            disabled={purchasing}
          >
            {purchasing ? 'Processing...' : 'Confirm Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DaycarePasses;
