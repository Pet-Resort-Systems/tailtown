/**
 * Coupon Input Component
 * 
 * Allows customers to enter and apply coupon codes during booking.
 * Features:
 * - Real-time validation
 * - Discount preview
 * - Error handling
 * - Loading states
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { LocalOffer as CouponIcon, Check as CheckIcon } from '@mui/icons-material';
import { couponService } from '../../services/couponService';
import { Coupon, ApplyCouponRequest } from '../../types/coupon';

interface CouponInputProps {
  customerId: string;
  subtotal: number;
  serviceIds?: string[];
  onCouponApplied: (coupon: Coupon, discountAmount: number) => void;
  onCouponRemoved: () => void;
  appliedCoupon?: Coupon;
}

export const CouponInput: React.FC<CouponInputProps> = ({
  customerId,
  subtotal,
  serviceIds,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    // Clear previous error
    setError(null);

    // Validate code format
    const validation = couponService.validateCouponCode(couponCode);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid coupon code');
      return;
    }

    setLoading(true);

    try {
      // Validate coupon with backend
      const request: ApplyCouponRequest = {
        code: couponCode.toUpperCase().trim(),
        customerId,
        subtotal,
        serviceIds
      };

      const result = await couponService.validateCoupon(request);

      if (!result.isValid) {
        setError(result.error || 'Invalid coupon code');
        setLoading(false);
        return;
      }

      // Get full coupon details
      const coupon = await couponService.getCouponByCode(couponCode.toUpperCase().trim());

      // Calculate discount
      const { discountAmount } = couponService.calculateDiscount(coupon, subtotal);

      // Apply coupon
      onCouponApplied(coupon, discountAmount);
      setCouponCode('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    setCouponCode('');
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
  };

  // If coupon is already applied, show applied state
  if (appliedCoupon) {
    const { discountAmount, finalPrice } = couponService.calculateDiscount(
      appliedCoupon,
      subtotal
    );

    return (
      <Paper elevation={2} sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CheckIcon />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Coupon Applied: {appliedCoupon.code}
              </Typography>
              <Typography variant="body2">
                {appliedCoupon.description}
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                You save: ${discountAmount.toFixed(2)}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={handleRemoveCoupon}
            sx={{ color: 'success.contrastText', borderColor: 'success.contrastText' }}
          >
            Remove
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Box>
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          label="Coupon Code"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => {
            setCouponCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          disabled={loading}
          error={!!error}
          InputProps={{
            startAdornment: <CouponIcon sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
        <Button
          variant="contained"
          onClick={handleApplyCoupon}
          disabled={loading || !couponCode.trim()}
          sx={{ minWidth: 100 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Apply'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Have a coupon? Enter it above to get a discount on your booking.
      </Typography>
    </Box>
  );
};

export default CouponInput;
