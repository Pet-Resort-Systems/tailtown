/**
 * Customer Loyalty Dashboard
 *
 * Shows customer their loyalty points, tier, and redemption options
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  CardGiftcard as GiftIcon,
  History as HistoryIcon,
  Redeem as RedeemIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { loyaltyService } from '../../services/loyaltyService';
import {
  CustomerLoyalty,
  PointTransaction,
  RedemptionOption,
  LoyaltyTier,
} from '../../types/loyalty';
import { formatCurrency } from '../../utils/formatters';

interface CustomerLoyaltyDashboardProps {
  customerId: string;
}

export const CustomerLoyaltyDashboard: React.FC<
  CustomerLoyaltyDashboardProps
> = ({ customerId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [redemptionOptions, setRedemptionOptions] = useState<
    RedemptionOption[]
  >([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [selectedOption, setSelectedOption] = useState<RedemptionOption | null>(
    null
  );
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [loyaltyData, transactionsData, optionsData, tiersData] =
        await Promise.all([
          loyaltyService.getCustomerLoyalty(customerId),
          loyaltyService.getPointTransactions(customerId, { limit: 10 }),
          loyaltyService.getRedemptionOptions(),
          loyaltyService.getTiers(),
        ]);

      setLoyalty(loyaltyData);
      setTransactions(transactionsData.data);
      setRedemptionOptions(optionsData.filter((o) => o.isActive));
      setTiers(tiersData);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to load loyalty information'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedOption || !loyalty) return;

    try {
      setError(null);
      await loyaltyService.redeemPoints(customerId, selectedOption.id);
      setShowRedeemDialog(false);
      setSelectedOption(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to redeem points');
    }
  };

  const getCurrentTier = (): LoyaltyTier | undefined => {
    if (!loyalty || !tiers.length) return undefined;
    return loyaltyService.calculateTier(loyalty.currentPoints, tiers);
  };

  const getNextTier = (): LoyaltyTier | undefined => {
    if (!loyalty || !tiers.length) return undefined;
    const currentTier = getCurrentTier();
    const sortedTiers = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    const currentIndex = sortedTiers.findIndex(
      (t) => t.level === currentTier?.level
    );
    return sortedTiers[currentIndex + 1];
  };

  const getTierProgress = (): number => {
    if (!loyalty || !tiers.length) return 0;
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();

    if (!nextTier) return 100; // Max tier reached

    const pointsInCurrentTier =
      loyalty.currentPoints - (currentTier?.minPoints || 0);
    const pointsNeededForNext =
      nextTier.minPoints - (currentTier?.minPoints || 0);

    return (pointsInCurrentTier / pointsNeededForNext) * 100;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!loyalty) {
    return (
      <Alert severity="info">
        Join our loyalty program to start earning rewards!
      </Alert>
    );
  }

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const tierProgress = getTierProgress();

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Points Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <StarIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Available Points</Typography>
              </Box>
              <Typography variant="h3">
                {loyaltyService.formatPoints(loyalty.currentPoints)}
              </Typography>
              <Typography variant="caption">
                Lifetime: {loyaltyService.formatPoints(loyalty.lifetimePoints)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrophyIcon sx={{ mr: 1, color: currentTier?.color }} />
                <Typography variant="h6">Current Tier</Typography>
              </Box>
              <Chip
                label={currentTier?.name || 'Bronze'}
                sx={{
                  backgroundColor: currentTier?.color,
                  color: 'white',
                  fontWeight: 'bold',
                  mb: 2,
                }}
              />
              {nextTier && (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {loyalty.pointsToNextTier} points to {nextTier.name}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={tierProgress}
                    sx={{ mt: 1 }}
                  />
                </>
              )}
              {!nextTier && (
                <Typography variant="body2" color="text.secondary">
                  🎉 You've reached the highest tier!
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Activity</Typography>
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>Total Visits:</strong> {loyalty.totalVisits}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Total Spent:</strong>{' '}
                {formatCurrency(loyalty.totalSpent)}
              </Typography>
              <Typography variant="body2">
                <strong>Member Since:</strong>{' '}
                {new Date(loyalty.memberSince).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tier Benefits */}
      {currentTier && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your {currentTier.name} Benefits
            </Typography>
            <Grid container spacing={2}>
              {currentTier.benefits.map((benefit, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Box display="flex" alignItems="center">
                    <StarIcon
                      sx={{ color: currentTier.color, mr: 1, fontSize: 20 }}
                    />
                    <Typography variant="body2">{benefit}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Redemption Options */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">
              <GiftIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Redeem Your Points
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {redemptionOptions.map((option) => {
              const canRedeem = loyaltyService.canRedeem(
                loyalty.currentPoints,
                option.pointsCost,
                0
              );

              return (
                <Grid item xs={12} sm={6} md={4} key={option.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {option.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        {option.description}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h5" color="primary" gutterBottom>
                        {loyaltyService.formatPoints(option.pointsCost)} pts
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={!canRedeem}
                        onClick={() => {
                          setSelectedOption(option);
                          setShowRedeemDialog(true);
                        }}
                        startIcon={<RedeemIcon />}
                      >
                        {canRedeem ? 'Redeem' : 'Not Enough Points'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">
              <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Recent Activity
            </Typography>
            <Button size="small" onClick={() => setShowHistoryDialog(true)}>
              View All
            </Button>
          </Box>

          <List>
            {transactions.slice(0, 5).map((transaction) => (
              <ListItem key={transaction.id}>
                <ListItemText
                  primary={transaction.description}
                  secondary={new Date(
                    transaction.createdAt
                  ).toLocaleDateString()}
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={`${transaction.points > 0 ? '+' : ''}${transaction.points}`}
                    color={transaction.points > 0 ? 'success' : 'error'}
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Redeem Confirmation Dialog */}
      <Dialog
        open={showRedeemDialog}
        onClose={() => setShowRedeemDialog(false)}
      >
        <DialogTitle>Confirm Redemption</DialogTitle>
        <DialogContent>
          {selectedOption && (
            <Box>
              <Typography gutterBottom>
                Are you sure you want to redeem{' '}
                <strong>{selectedOption.name}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                This will cost{' '}
                {loyaltyService.formatPoints(selectedOption.pointsCost)} points.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You will have{' '}
                {loyaltyService.formatPoints(
                  loyalty.currentPoints - selectedOption.pointsCost
                )}{' '}
                points remaining.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRedeemDialog(false)}>Cancel</Button>
          <Button onClick={handleRedeem} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Point History</DialogTitle>
        <DialogContent>
          <List>
            {transactions.map((transaction) => (
              <ListItem key={transaction.id}>
                <ListItemText
                  primary={transaction.description}
                  secondary={new Date(transaction.createdAt).toLocaleString()}
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={`${transaction.points > 0 ? '+' : ''}${transaction.points}`}
                    color={transaction.points > 0 ? 'success' : 'error'}
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerLoyaltyDashboard;
