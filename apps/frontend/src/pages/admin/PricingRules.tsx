/**
 * Pricing Rules Management Page
 * 
 * Admin interface for managing dynamic pricing rules:
 * - View all pricing rules
 * - Create/edit/delete rules
 * - Enable/disable rules
 * - View pricing calendar
 * - Manage holidays
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as SurchargeIcon,
  TrendingDown as DiscountIcon,
  CalendarToday as CalendarIcon,
  Event as HolidayIcon
} from '@mui/icons-material';
import { dynamicPricingService } from '../../services/dynamicPricingService';
import {
  AnyPricingRule,
  PricingRuleType,
  PricingAdjustmentType,
  Holiday
} from '../../types/dynamicPricing';
import { formatCurrency } from '../../utils/formatters';

export const PricingRules: React.FC = () => {
  const [rules, setRules] = useState<AnyPricingRule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AnyPricingRule | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<AnyPricingRule>>({
    name: '',
    description: '',
    type: 'SEASONAL',
    adjustmentType: 'PERCENTAGE',
    adjustmentValue: 0,
    priority: 1,
    isActive: true
  });

  const [holidayFormData, setHolidayFormData] = useState<Partial<Holiday>>({
    name: '',
    date: '',
    isRecurring: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulesData, holidaysData] = await Promise.all([
        dynamicPricingService.getAllPricingRules(),
        dynamicPricingService.getHolidays()
      ]);
      setRules(rulesData.data);
      setHolidays(holidaysData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      type: 'SEASONAL',
      adjustmentType: 'PERCENTAGE',
      adjustmentValue: 0,
      priority: 1,
      isActive: true
    });
    setShowRuleDialog(true);
  };

  const handleEditRule = (rule: AnyPricingRule) => {
    setEditingRule(rule);
    setFormData(rule);
    setShowRuleDialog(true);
  };

  const handleSaveRule = async () => {
    try {
      setError(null);
      
      // Validate
      const validation = dynamicPricingService.validatePricingRule(formData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      if (editingRule) {
        await dynamicPricingService.updatePricingRule(editingRule.id, formData);
      } else {
        await dynamicPricingService.createPricingRule(formData);
      }

      setShowRuleDialog(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save pricing rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this pricing rule?')) return;

    try {
      await dynamicPricingService.deletePricingRule(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete pricing rule');
    }
  };

  const handleToggleRule = async (rule: AnyPricingRule) => {
    try {
      await dynamicPricingService.updatePricingRule(rule.id, {
        isActive: !rule.isActive
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update pricing rule');
    }
  };

  const handleSaveHoliday = async () => {
    try {
      setError(null);
      await dynamicPricingService.saveHoliday(holidayFormData);
      setShowHolidayDialog(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await dynamicPricingService.deleteHoliday(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete holiday');
    }
  };

  const getRuleTypeColor = (type: PricingRuleType): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
    const colors: Record<PricingRuleType, any> = {
      SEASONAL: 'primary',
      PEAK_TIME: 'warning',
      CAPACITY_BASED: 'info',
      SPECIAL_EVENT: 'secondary',
      DAY_OF_WEEK: 'success',
      ADVANCE_BOOKING: 'info',
      LAST_MINUTE: 'error'
    };
    return colors[type] || 'default';
  };

  const sortedRules = dynamicPricingService.sortRulesByPriority(rules);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dynamic Pricing Rules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage seasonal, peak time, and capacity-based pricing
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<HolidayIcon />}
            onClick={() => setShowHolidayDialog(true)}
          >
            Manage Holidays
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateRule}
          >
            New Pricing Rule
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Pricing Rules List */}
      <Grid container spacing={3}>
        {sortedRules.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box textAlign="center" py={4}>
                  <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Pricing Rules
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Create your first pricing rule to implement dynamic pricing
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateRule}
                  >
                    Create Pricing Rule
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          sortedRules.map((rule) => (
            <Grid item xs={12} md={6} lg={4} key={rule.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {rule.name}
                      </Typography>
                      <Chip
                        label={dynamicPricingService.getRuleTypeLabel(rule.type)}
                        color={getRuleTypeColor(rule.type)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={`Priority: ${rule.priority}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={rule.isActive}
                          onChange={() => handleToggleRule(rule)}
                          size="small"
                        />
                      }
                      label=""
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {rule.description}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {rule.adjustmentValue >= 0 ? (
                      <SurchargeIcon color="error" fontSize="small" />
                    ) : (
                      <DiscountIcon color="success" fontSize="small" />
                    )}
                    <Typography variant="h6">
                      {rule.adjustmentType === 'PERCENTAGE'
                        ? `${rule.adjustmentValue >= 0 ? '+' : ''}${rule.adjustmentValue}%`
                        : `${rule.adjustmentValue >= 0 ? '+' : ''}${formatCurrency(rule.adjustmentValue)}`}
                    </Typography>
                  </Box>

                  {rule.serviceIds && rule.serviceIds.length > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Applies to {rule.serviceIds.length} service(s)
                    </Typography>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditRule(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Pricing Rule Dialog */}
      <Dialog
        open={showRuleDialog}
        onClose={() => setShowRuleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Rule Type *"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <MenuItem value="SEASONAL">Seasonal</MenuItem>
                <MenuItem value="PEAK_TIME">Peak Time</MenuItem>
                <MenuItem value="CAPACITY_BASED">Capacity-Based</MenuItem>
                <MenuItem value="SPECIAL_EVENT">Special Event</MenuItem>
                <MenuItem value="DAY_OF_WEEK">Day of Week</MenuItem>
                <MenuItem value="ADVANCE_BOOKING">Advance Booking</MenuItem>
                <MenuItem value="LAST_MINUTE">Last Minute</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Priority *"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                helperText="Higher priority rules apply first"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Adjustment Type *"
                value={formData.adjustmentType}
                onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value as PricingAdjustmentType })}
              >
                <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                <MenuItem value="FIXED_AMOUNT">Fixed Amount</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Adjustment Value *"
                value={formData.adjustmentValue}
                onChange={(e) => setFormData({ ...formData, adjustmentValue: parseFloat(e.target.value) })}
                helperText={
                  formData.adjustmentType === 'PERCENTAGE'
                    ? 'Positive = surcharge, Negative = discount'
                    : 'Dollar amount'
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRuleDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained">
            {editingRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Holiday Dialog */}
      <Dialog
        open={showHolidayDialog}
        onClose={() => setShowHolidayDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manage Holidays</DialogTitle>
        <DialogContent>
          <List>
            {holidays.map((holiday) => (
              <ListItem key={holiday.id}>
                <ListItemText
                  primary={holiday.name}
                  secondary={holiday.date}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteHoliday(holiday.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Add Holiday
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Holiday Name"
                value={holidayFormData.name}
                onChange={(e) => setHolidayFormData({ ...holidayFormData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={holidayFormData.date}
                onChange={(e) => setHolidayFormData({ ...holidayFormData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={holidayFormData.isRecurring}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, isRecurring: e.target.checked })}
                  />
                }
                label="Recurring (same date every year)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHolidayDialog(false)}>Close</Button>
          <Button onClick={handleSaveHoliday} variant="contained">
            Add Holiday
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PricingRules;
