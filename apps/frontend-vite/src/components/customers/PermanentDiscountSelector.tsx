/**
 * Permanent Discount Selector Component
 * Allows staff to assign a permanent discount coupon to a customer account
 * (e.g., military, senior, first responder discounts)
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  LocalOffer as CouponIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { customerService } from "../../services/customerService";
import { couponService } from "../../services/couponService";

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
}

interface PermanentDiscountSelectorProps {
  customerId: string;
  onUpdate?: () => void;
}

const PermanentDiscountSelector: React.FC<PermanentDiscountSelectorProps> = ({
  customerId,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string>("");

  // Load current permanent coupon and available coupons
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load current permanent coupon
        const current = await customerService.getPermanentCoupon(customerId);
        setCurrentCoupon(current);
        setSelectedCouponId(current?.id || "");

        // Load all active coupons
        const couponsResponse = await couponService.getAllCoupons({
          status: "ACTIVE",
        });
        setAvailableCoupons(couponsResponse?.data || []);
      } catch (err: any) {
        console.error("Error loading permanent discount data:", err);
        setError("Failed to load discount information");
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      loadData();
    }
  }, [customerId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await customerService.setPermanentCoupon(
        customerId,
        selectedCouponId || null
      );

      // Update current coupon display
      if (selectedCouponId) {
        const coupon = availableCoupons.find((c) => c.id === selectedCouponId);
        setCurrentCoupon(coupon || null);
      } else {
        setCurrentCoupon(null);
      }

      setSuccess("Permanent discount updated successfully");
      onUpdate?.();
    } catch (err: any) {
      console.error("Error saving permanent discount:", err);
      setError("Failed to save permanent discount");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await customerService.removePermanentCoupon(customerId);
      setCurrentCoupon(null);
      setSelectedCouponId("");
      setSuccess("Permanent discount removed");
      onUpdate?.();
    } catch (err: any) {
      console.error("Error removing permanent discount:", err);
      setError("Failed to remove permanent discount");
    } finally {
      setSaving(false);
    }
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === "PERCENTAGE") {
      return `${coupon.discountValue}% off`;
    }
    return `$${coupon.discountValue.toFixed(2)} off`;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <CouponIcon sx={{ mr: 1, color: "primary.main" }} />
        <Typography variant="h6">Permanent Discount</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Assign a permanent discount (e.g., military, senior, first responder)
        that will automatically apply at checkout.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {currentCoupon && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Current Discount:
          </Typography>
          <Chip
            icon={<CouponIcon />}
            label={`${currentCoupon.code} - ${
              currentCoupon.description
            } (${formatDiscount(currentCoupon)})`}
            color="success"
            onDelete={handleRemove}
            deleteIcon={<DeleteIcon />}
            sx={{ mt: 1 }}
          />
        </Box>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Discount</InputLabel>
        <Select
          value={selectedCouponId}
          onChange={(e) => setSelectedCouponId(e.target.value)}
          label="Select Discount"
          disabled={saving}
        >
          <MenuItem value="">
            <em>No permanent discount</em>
          </MenuItem>
          {availableCoupons.map((coupon) => (
            <MenuItem key={coupon.id} value={coupon.id}>
              <Box>
                <Typography variant="body1">{coupon.code}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {coupon.description} - {formatDiscount(coupon)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving || selectedCouponId === (currentCoupon?.id || "")}
        startIcon={saving ? <CircularProgress size={16} /> : <CouponIcon />}
      >
        {saving ? "Saving..." : "Save Discount"}
      </Button>
    </Paper>
  );
};

export default PermanentDiscountSelector;
