/**
 * Loyalty Program Configuration Page
 * 
 * Admin interface for configuring the loyalty rewards program
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  CardGiftcard as GiftIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { loyaltyService } from '../../services/loyaltyService';
import {
  LoyaltyConfig,
  PointEarningRule,
  RedemptionOption,
  LoyaltyTier,
  PointEarningType,
  RedemptionType
} from '../../types/loyalty';

export const LoyaltyProgram: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Configuration state
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [earningRules, setEarningRules] = useState<PointEarningRule[]>([]);
  const [redemptionOptions, setRedemptionOptions] = useState<RedemptionOption[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

  // Dialog state
  const [showEarningDialog, setShowEarningDialog] = useState(false);
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);
  const [editingEarningRule, setEditingEarningRule] = useState<PointEarningRule | null>(null);
  const [editingRedemption, setEditingRedemption] = useState<RedemptionOption | null>(null);

  // Form state
  const [earningFormData, setEarningFormData] = useState<Partial<PointEarningRule>>({
    type: 'DOLLARS_SPENT',
    isActive: true
  });

  const [redemptionFormData, setRedemptionFormData] = useState<Partial<RedemptionOption>>({
    type: 'DISCOUNT_FIXED',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configData, rulesData, optionsData, tiersData] = await Promise.all([
        loyaltyService.getConfig(),
        loyaltyService.getEarningRules(),
        loyaltyService.getRedemptionOptions(),
        loyaltyService.getTiers()
      ]);

      setConfig(configData);
      setEarningRules(rulesData);
      setRedemptionOptions(optionsData);
      setTiers(tiersData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load loyalty program');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProgram = async (enabled: boolean) => {
    try {
      setError(null);
      const updated = await loyaltyService.toggleProgram(enabled);
      setConfig(updated);
      setSuccess(`Loyalty program ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle program');
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;

    try {
      setError(null);
      const updated = await loyaltyService.updateConfig(config);
      setConfig(updated);
      setSuccess('Configuration updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update configuration');
    }
  };

  const handleSaveEarningRule = async () => {
    try {
      setError(null);

      const validation = loyaltyService.validateEarningRule(earningFormData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      if (editingEarningRule) {
        await loyaltyService.updateEarningRule(editingEarningRule.id, earningFormData);
      } else {
        await loyaltyService.createEarningRule(earningFormData);
      }

      setShowEarningDialog(false);
      setEditingEarningRule(null);
      setEarningFormData({ type: 'DOLLARS_SPENT', isActive: true });
      loadData();
      setSuccess('Earning rule saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save earning rule');
    }
  };

  const handleSaveRedemption = async () => {
    try {
      setError(null);

      const validation = loyaltyService.validateRedemptionOption(redemptionFormData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      if (editingRedemption) {
        await loyaltyService.updateRedemptionOption(editingRedemption.id, redemptionFormData);
      } else {
        await loyaltyService.createRedemptionOption(redemptionFormData);
      }

      setShowRedemptionDialog(false);
      setEditingRedemption(null);
      setRedemptionFormData({ type: 'DISCOUNT_FIXED', isActive: true });
      loadData();
      setSuccess('Redemption option saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save redemption option');
    }
  };

  const handleDeleteEarningRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this earning rule?')) return;

    try {
      await loyaltyService.deleteEarningRule(id);
      loadData();
      setSuccess('Earning rule deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete earning rule');
    }
  };

  const handleDeleteRedemption = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this redemption option?')) return;

    try {
      await loyaltyService.deleteRedemptionOption(id);
      loadData();
      setSuccess('Redemption option deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete redemption option');
    }
  };

  const getEarningTypeLabel = (type: PointEarningType): string => {
    const labels: Record<PointEarningType, string> = {
      DOLLARS_SPENT: 'Dollars Spent',
      VISIT: 'Visit/Check-in',
      REFERRAL: 'Referral',
      BIRTHDAY: 'Birthday Bonus',
      ANNIVERSARY: 'Anniversary Bonus',
      REVIEW: 'Review',
      SOCIAL_SHARE: 'Social Share',
      SERVICE_SPECIFIC: 'Service-Specific'
    };
    return labels[type];
  };

  const getRedemptionTypeLabel = (type: RedemptionType): string => {
    const labels: Record<RedemptionType, string> = {
      DISCOUNT_PERCENTAGE: 'Percentage Discount',
      DISCOUNT_FIXED: 'Fixed Discount',
      FREE_SERVICE: 'Free Service',
      FREE_ADDON: 'Free Add-on',
      UPGRADE: 'Suite Upgrade'
    };
    return labels[type];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box>
        <Alert severity="error">Failed to load loyalty program configuration</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Loyalty Rewards Program
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure your loyalty program to reward and retain customers
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={config.isEnabled}
              onChange={(e) => handleToggleProgram(e.target.checked)}
              color="primary"
            />
          }
          label={config.isEnabled ? 'Enabled' : 'Disabled'}
        />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<StarIcon />} label="General Settings" />
          <Tab icon={<TrendingUpIcon />} label="Earning Rules" />
          <Tab icon={<TrophyIcon />} label="Tiers" />
          <Tab icon={<GiftIcon />} label="Redemptions" />
        </Tabs>
      </Box>

      {/* General Settings Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Program Settings
                </Typography>

                <TextField
                  fullWidth
                  label="Program Name"
                  value={config.programName}
                  onChange={(e) => setConfig({ ...config, programName: e.target.value })}
                  sx={{ mb: 2 }}
                  helperText="e.g., 'Happy Tails Rewards', 'Paws & Perks'"
                />

                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Points to Redeem"
                  value={config.minimumPointsToRedeem}
                  onChange={(e) => setConfig({ ...config, minimumPointsToRedeem: parseInt(e.target.value) })}
                  sx={{ mb: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.tiersEnabled}
                      onChange={(e) => setConfig({ ...config, tiersEnabled: e.target.checked })}
                    />
                  }
                  label="Enable Tier System"
                  sx={{ mb: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.pointsExpireEnabled}
                      onChange={(e) => setConfig({ ...config, pointsExpireEnabled: e.target.checked })}
                    />
                  }
                  label="Points Expire"
                  sx={{ mb: 2 }}
                />

                {config.pointsExpireEnabled && (
                  <TextField
                    fullWidth
                    type="number"
                    label="Points Expire After (Days)"
                    value={config.pointsExpireDays || 365}
                    onChange={(e) => setConfig({ ...config, pointsExpireDays: parseInt(e.target.value) })}
                    sx={{ mb: 2 }}
                  />
                )}

                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleUpdateConfig}
                  fullWidth
                >
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Display Options
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showPointsOnReceipts}
                      onChange={(e) => setConfig({ ...config, showPointsOnReceipts: e.target.checked })}
                    />
                  }
                  label="Show Points on Receipts"
                  sx={{ mb: 2, display: 'block' }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showTierOnProfile}
                      onChange={(e) => setConfig({ ...config, showTierOnProfile: e.target.checked })}
                    />
                  }
                  label="Show Tier on Customer Profile"
                  sx={{ mb: 2, display: 'block' }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Earning Rules Tab */}
      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Point Earning Rules</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingEarningRule(null);
                setEarningFormData({ type: 'DOLLARS_SPENT', isActive: true });
                setShowEarningDialog(true);
              }}
            >
              Add Earning Rule
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Configuration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {earningRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{getEarningTypeLabel(rule.type)}</TableCell>
                  <TableCell>
                    {rule.type === 'DOLLARS_SPENT' && `${rule.pointsPerDollar} pts/$1`}
                    {rule.type === 'VISIT' && `${rule.pointsPerVisit} pts/visit`}
                    {rule.type === 'REFERRAL' && `${rule.pointsForReferrer}/${rule.pointsForReferee} pts`}
                    {(rule.type === 'BIRTHDAY' || rule.type === 'ANNIVERSARY') && `${rule.bonusPoints} pts`}
                    {rule.type === 'REVIEW' && `${rule.pointsPerReview} pts/review`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rule.isActive ? 'Active' : 'Inactive'}
                      color={rule.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingEarningRule(rule);
                        setEarningFormData(rule);
                        setShowEarningDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteEarningRule(rule.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Tiers Tab */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Membership Tiers
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Configure tier thresholds, multipliers, and benefits
          </Typography>

          <Grid container spacing={3}>
            {tiers.map((tier) => (
              <Grid item xs={12} md={6} lg={4} key={tier.level}>
                <Card sx={{ borderTop: `4px solid ${tier.color}` }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TrophyIcon sx={{ color: tier.color, mr: 1 }} />
                      <Typography variant="h6">{tier.name}</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {loyaltyService.formatPoints(tier.minPoints)}+ points
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body2" gutterBottom>
                      <strong>Points Multiplier:</strong> {tier.pointsMultiplier}x
                    </Typography>

                    {tier.discountPercentage && tier.discountPercentage > 0 && (
                      <Typography variant="body2" gutterBottom>
                        <strong>Discount:</strong> {tier.discountPercentage}% off
                      </Typography>
                    )}

                    <Typography variant="body2" sx={{ mt: 2 }}>
                      <strong>Benefits:</strong>
                    </Typography>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {tier.benefits.map((benefit, idx) => (
                        <li key={idx}>
                          <Typography variant="caption">{benefit}</Typography>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Redemptions Tab */}
      {activeTab === 3 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Redemption Options</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingRedemption(null);
                setRedemptionFormData({ type: 'DISCOUNT_FIXED', isActive: true });
                setShowRedemptionDialog(true);
              }}
            >
              Add Redemption Option
            </Button>
          </Box>

          <Grid container spacing={3}>
            {redemptionOptions.map((option) => (
              <Grid item xs={12} md={6} lg={4} key={option.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6">{option.name}</Typography>
                      <Chip
                        label={option.isActive ? 'Active' : 'Inactive'}
                        color={option.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {option.description}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h5" color="primary" gutterBottom>
                      {loyaltyService.formatPoints(option.pointsCost)} points
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      {getRedemptionTypeLabel(option.type)}
                    </Typography>

                    <Box display="flex" gap={1} mt={2}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingRedemption(option);
                          setRedemptionFormData(option);
                          setShowRedemptionDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRedemption(option.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Earning Rule Dialog */}
      <Dialog
        open={showEarningDialog}
        onClose={() => setShowEarningDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEarningRule ? 'Edit Earning Rule' : 'Add Earning Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Earning Type"
                value={earningFormData.type}
                onChange={(e) => setEarningFormData({ ...earningFormData, type: e.target.value as PointEarningType })}
              >
                <MenuItem value="DOLLARS_SPENT">Dollars Spent</MenuItem>
                <MenuItem value="VISIT">Visit/Check-in</MenuItem>
                <MenuItem value="REFERRAL">Referral</MenuItem>
                <MenuItem value="BIRTHDAY">Birthday Bonus</MenuItem>
                <MenuItem value="ANNIVERSARY">Anniversary Bonus</MenuItem>
                <MenuItem value="REVIEW">Review</MenuItem>
                <MenuItem value="SOCIAL_SHARE">Social Share</MenuItem>
                <MenuItem value="SERVICE_SPECIFIC">Service-Specific</MenuItem>
              </TextField>
            </Grid>

            {earningFormData.type === 'DOLLARS_SPENT' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Points per Dollar"
                  value={earningFormData.pointsPerDollar || 1}
                  onChange={(e) => setEarningFormData({ ...earningFormData, pointsPerDollar: parseFloat(e.target.value) })}
                />
              </Grid>
            )}

            {earningFormData.type === 'VISIT' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Points per Visit"
                  value={earningFormData.pointsPerVisit || 10}
                  onChange={(e) => setEarningFormData({ ...earningFormData, pointsPerVisit: parseInt(e.target.value) })}
                />
              </Grid>
            )}

            {earningFormData.type === 'REFERRAL' && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Points for Referrer"
                    value={earningFormData.pointsForReferrer || 500}
                    onChange={(e) => setEarningFormData({ ...earningFormData, pointsForReferrer: parseInt(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Points for Referee"
                    value={earningFormData.pointsForReferee || 100}
                    onChange={(e) => setEarningFormData({ ...earningFormData, pointsForReferee: parseInt(e.target.value) })}
                  />
                </Grid>
              </>
            )}

            {(earningFormData.type === 'BIRTHDAY' || earningFormData.type === 'ANNIVERSARY') && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Bonus Points"
                  value={earningFormData.bonusPoints || 100}
                  onChange={(e) => setEarningFormData({ ...earningFormData, bonusPoints: parseInt(e.target.value) })}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={earningFormData.isActive}
                    onChange={(e) => setEarningFormData({ ...earningFormData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEarningDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEarningRule} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Redemption Dialog */}
      <Dialog
        open={showRedemptionDialog}
        onClose={() => setShowRedemptionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRedemption ? 'Edit Redemption Option' : 'Add Redemption Option'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={redemptionFormData.name || ''}
                onChange={(e) => setRedemptionFormData({ ...redemptionFormData, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={redemptionFormData.description || ''}
                onChange={(e) => setRedemptionFormData({ ...redemptionFormData, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Redemption Type"
                value={redemptionFormData.type}
                onChange={(e) => setRedemptionFormData({ ...redemptionFormData, type: e.target.value as RedemptionType })}
              >
                <MenuItem value="DISCOUNT_FIXED">Fixed Discount</MenuItem>
                <MenuItem value="DISCOUNT_PERCENTAGE">Percentage Discount</MenuItem>
                <MenuItem value="FREE_SERVICE">Free Service</MenuItem>
                <MenuItem value="FREE_ADDON">Free Add-on</MenuItem>
                <MenuItem value="UPGRADE">Suite Upgrade</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Points Cost"
                value={redemptionFormData.pointsCost || 0}
                onChange={(e) => setRedemptionFormData({ ...redemptionFormData, pointsCost: parseInt(e.target.value) })}
              />
            </Grid>

            {redemptionFormData.type === 'DISCOUNT_FIXED' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount Amount ($)"
                  value={redemptionFormData.discountAmount || 0}
                  onChange={(e) => setRedemptionFormData({ ...redemptionFormData, discountAmount: parseFloat(e.target.value) })}
                />
              </Grid>
            )}

            {redemptionFormData.type === 'DISCOUNT_PERCENTAGE' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount Percentage (%)"
                  value={redemptionFormData.discountPercentage || 0}
                  onChange={(e) => setRedemptionFormData({ ...redemptionFormData, discountPercentage: parseFloat(e.target.value) })}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={redemptionFormData.isActive}
                    onChange={(e) => setRedemptionFormData({ ...redemptionFormData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRedemptionDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveRedemption} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoyaltyProgram;
