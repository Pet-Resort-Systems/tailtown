/**
 * PriceRuleDetailsPage Component
 *
 * This component handles the creation and editing of price rules.
 * It provides a form interface for managing all price rule properties
 * including rule type, discount settings, and conditional parameters.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  FormHelperText,
  Chip,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import priceRuleService from '../../services/priceRuleService';
import {
  PriceRule,
  PriceRuleType,
  DiscountType,
  PriceAdjustmentType,
} from '../../types/priceRule';

const PriceRuleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Check if this is a new price rule (either id is 'new' or we're on the new route)
  const isNew =
    id === 'new' || window.location.pathname.includes('/price-rules/new');
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Check if we're on the new price rule page

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<PriceRuleType | ''>('');
  const [adjustmentType, setAdjustmentType] =
    useState<PriceAdjustmentType>('DISCOUNT'); // Default to discount
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE'); // Default to percentage discount
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [minQuantity, setMinQuantity] = useState<number | ''>('');
  const [maxQuantity, setMaxQuantity] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [priority, setPriority] = useState<number>(10);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadPriceRule = useCallback(async () => {
    try {
      setLoading(true);
      const response = await priceRuleService.getPriceRuleById(id!);
      const priceRule = response.data;

      // Set form fields
      setName(priceRule.name);
      setDescription(priceRule.description || '');
      setRuleType(priceRule.ruleType);
      setAdjustmentType(priceRule.adjustmentType || 'DISCOUNT');
      setDiscountType(priceRule.discountType);
      setDiscountValue(priceRule.discountValue);
      setMinQuantity(priceRule.minQuantity || '');
      setMaxQuantity(priceRule.maxQuantity || '');
      setIsActive(priceRule.isActive);
      setPriority(priceRule.priority);

      if (priceRule.daysOfWeek) {
        try {
          setDaysOfWeek(JSON.parse(priceRule.daysOfWeek));
        } catch (e) {
          console.error('Error parsing days of week:', e);
        }
      }

      if (priceRule.startDate) {
        setStartDate(priceRule.startDate.split('T')[0]);
      }

      if (priceRule.endDate) {
        setEndDate(priceRule.endDate.split('T')[0]);
      }

      setError('');
    } catch (err: any) {
      console.error('Error loading price rule:', err);
      setError(err.response?.data?.message || 'Failed to load price rule');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Only load price rule data if this is an edit (not a new rule)
    if (id && id !== 'new') {
      loadPriceRule();
    }
  }, [id, loadPriceRule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!name || !ruleType || !discountType || discountValue === undefined) {
      setError('Please fill in all required fields');
      return;
    }

    if (
      discountType === 'PERCENTAGE' &&
      (discountValue < 0 || discountValue > 100)
    ) {
      setError('Percentage discount must be between 0 and 100');
      return;
    }

    if (ruleType === 'DAY_OF_WEEK' && daysOfWeek.length === 0) {
      setError('Please select at least one day of the week');
      return;
    }

    try {
      setSaving(true);
      const priceRuleData: Partial<PriceRule> = {
        name,
        description: description || undefined,
        ruleType,
        adjustmentType,
        discountType,
        discountValue,
        minQuantity: minQuantity === '' ? undefined : Number(minQuantity),
        maxQuantity: maxQuantity === '' ? undefined : Number(maxQuantity),
        isActive,
        priority,
        daysOfWeek:
          daysOfWeek.length > 0 ? JSON.stringify(daysOfWeek) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      // Submit the price rule data to the API

      if (isNew) {
        // Create new price rule
        await priceRuleService.createPriceRule(priceRuleData);
      } else {
        // Update existing price rule
        await priceRuleService.updatePriceRule(id!, priceRuleData);
      }

      navigate('/settings/price-rules');
    } catch (err: any) {
      console.error('Error saving price rule:', err);
      setError(err.response?.data?.message || 'Failed to save price rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const getDiscountTypeLabel = () => {
    if (discountType === 'PERCENTAGE') {
      return '%';
    } else if (discountType === 'FIXED_AMOUNT') {
      return '$';
    } else {
      return '';
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  // Component rendering logic follows

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            component={Link}
            to="/settings/price-rules"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Box>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
              <MuiLink component={Link} to="/settings" color="inherit">
                Settings
              </MuiLink>
              <MuiLink
                component={Link}
                to="/settings/price-rules"
                color="inherit"
              >
                Price Rules
              </MuiLink>
              <Typography color="text.primary">
                {isNew ? 'Create New Rule' : 'Edit Rule'}
              </Typography>
            </Breadcrumbs>
            <Typography variant="h4" component="h1">
              {isNew ? 'Create New Price Rule' : 'Edit Price Rule'}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="Rule Name"
                    fullWidth
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Rule Type</InputLabel>
                    <Select
                      value={ruleType}
                      onChange={(e) => setRuleType(e.target.value as any)}
                      label="Rule Type"
                    >
                      <MenuItem value="DAY_OF_WEEK">Day of Week</MenuItem>
                      <MenuItem value="MULTI_DAY">Multi-Day Stay</MenuItem>
                      <MenuItem value="MULTI_PET">Multiple Pets</MenuItem>
                      <MenuItem value="SEASONAL">Seasonal</MenuItem>
                      <MenuItem value="PROMOTIONAL">Promotional</MenuItem>
                      <MenuItem value="CUSTOM">Custom</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Adjustment Type</InputLabel>
                    <Select
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value as any)}
                      label="Adjustment Type"
                    >
                      <MenuItem value="DISCOUNT">
                        Discount (Reduce Price)
                      </MenuItem>
                      <MenuItem value="SURCHARGE">
                        Surcharge (Increase Price)
                      </MenuItem>
                    </Select>
                    <FormHelperText>
                      {adjustmentType === 'DISCOUNT'
                        ? 'Reduces the price'
                        : 'Increases the price'}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Value Type</InputLabel>
                    <Select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      label="Value Type"
                    >
                      <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                      <MenuItem value="FIXED_AMOUNT">Fixed Amount</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label={`${
                      adjustmentType === 'DISCOUNT' ? 'Discount' : 'Surcharge'
                    } Value (${getDiscountTypeLabel()})`}
                    fullWidth
                    required
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    InputProps={{
                      inputProps: {
                        min: 0,
                        max: discountType === 'PERCENTAGE' ? 100 : undefined,
                        step: discountType === 'PERCENTAGE' ? 1 : 0.01,
                      },
                    }}
                    size="small"
                    error={
                      discountType === 'PERCENTAGE' &&
                      (discountValue < 0 || discountValue > 100)
                    }
                    helperText={
                      discountType === 'PERCENTAGE' &&
                      (discountValue < 0 || discountValue > 100)
                        ? 'Percentage must be between 0 and 100'
                        : ''
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Priority"
                    fullWidth
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    helperText="Higher values have higher priority"
                    InputProps={{
                      inputProps: {
                        min: 0,
                        step: 1,
                      },
                    }}
                    size="small"
                  />
                </Grid>

                {(ruleType === 'MULTI_DAY' || ruleType === 'MULTI_PET') && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={`Minimum ${
                          ruleType === 'MULTI_DAY' ? 'Days' : 'Pets'
                        }`}
                        fullWidth
                        type="number"
                        value={minQuantity}
                        onChange={(e) =>
                          setMinQuantity(
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        InputProps={{
                          inputProps: {
                            min: 1,
                            step: 1,
                          },
                        }}
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={`Maximum ${
                          ruleType === 'MULTI_DAY' ? 'Days' : 'Pets'
                        }`}
                        fullWidth
                        type="number"
                        value={maxQuantity}
                        onChange={(e) =>
                          setMaxQuantity(
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        InputProps={{
                          inputProps: {
                            min: Number(minQuantity) || 1,
                            step: 1,
                          },
                        }}
                        size="small"
                      />
                    </Grid>
                  </>
                )}

                {ruleType === 'DAY_OF_WEEK' && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Days of Week
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <Chip
                          key={day}
                          label={getDayName(day)}
                          onClick={() => handleDayToggle(day)}
                          color={
                            daysOfWeek.includes(day) ? 'primary' : 'default'
                          }
                          variant={
                            daysOfWeek.includes(day) ? 'filled' : 'outlined'
                          }
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Box>
                    {ruleType === 'DAY_OF_WEEK' && daysOfWeek.length === 0 && (
                      <FormHelperText error>
                        Please select at least one day
                      </FormHelperText>
                    )}
                  </Grid>
                )}

                {(ruleType === 'SEASONAL' || ruleType === 'PROMOTIONAL') && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Start Date"
                        fullWidth
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="End Date"
                        fullWidth
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                    }
                    label="Active"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button
              variant="outlined"
              onClick={() => navigate('/settings/price-rules')}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={saving}
            >
              {saving ? (
                <CircularProgress size={24} />
              ) : isNew ? (
                'Create Rule'
              ) : (
                'Update Rule'
              )}
            </Button>
          </Box>
        </form>
      </Box>
    </Container>
  );
};

export default PriceRuleDetailsPage;
