/**
 * Coupon Management Page
 *
 * Admin interface for managing coupons:
 * - View all coupons
 * - Create new coupons
 * - Edit existing coupons
 * - Bulk coupon generation
 * - View usage statistics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { couponService } from '../../services/couponService';
import { Coupon, CouponType, CreateCouponRequest } from '../../types/coupon';
import { formatDate } from '../../utils/formatters';

export const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<Partial<CreateCouponRequest>>({
    type: 'PERCENTAGE',
    discountValue: 10,
    maxUsesPerCustomer: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getAllCoupons();
      setCoupons(response.data);
    } catch (err) {
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        discountValue: coupon.discountValue,
        minimumPurchase: coupon.minimumPurchase,
        firstTimeCustomersOnly: coupon.firstTimeCustomersOnly,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        maxTotalUses: coupon.maxTotalUses,
        maxUsesPerCustomer: coupon.maxUsesPerCustomer,
        notes: coupon.notes,
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        type: 'PERCENTAGE',
        discountValue: 10,
        maxUsesPerCustomer: 1,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
    setFormData({});
    setError(null);
  };

  const handleSaveCoupon = async () => {
    try {
      setError(null);

      // Validation
      if (
        !formData.code ||
        !formData.description ||
        !formData.validFrom ||
        !formData.validUntil
      ) {
        setError('Please fill in all required fields');
        return;
      }

      if (editingCoupon) {
        // Update existing coupon
        await couponService.updateCoupon(
          editingCoupon.id,
          formData as Partial<Coupon>
        );
        setSuccess('Coupon updated successfully');
      } else {
        // Create new coupon
        await couponService.createCoupon(formData as CreateCouponRequest);
        setSuccess('Coupon created successfully');
      }

      handleCloseDialog();
      loadCoupons();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      await couponService.deleteCoupon(id);
      setSuccess('Coupon deleted successfully');
      loadCoupons();
    } catch (err) {
      setError('Failed to delete coupon');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Copied "${code}" to clipboard`);
  };

  const getStatusColor = (
    coupon: Coupon
  ): 'success' | 'warning' | 'error' | 'default' => {
    if (coupon.status === 'EXPIRED' || couponService.isCouponExpired(coupon))
      return 'error';
    if (coupon.status === 'DEPLETED' || couponService.isCouponDepleted(coupon))
      return 'warning';
    if (coupon.status === 'INACTIVE') return 'default';
    return 'success';
  };

  const getStatusLabel = (coupon: Coupon): string => {
    if (couponService.isCouponExpired(coupon)) return 'EXPIRED';
    if (couponService.isCouponDepleted(coupon)) return 'DEPLETED';
    if (couponService.isCouponNotYetValid(coupon)) return 'NOT YET VALID';
    return coupon.status;
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Coupon Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Coupon
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Valid Period</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight="bold">
                      {coupon.code}
                    </Typography>
                    <Tooltip title="Copy code">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyCode(coupon.code)}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>{coupon.description}</TableCell>
                <TableCell>
                  {couponService.formatCouponDiscount(coupon)}
                  {coupon.minimumPurchase && (
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Min: ${coupon.minimumPurchase}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(
                      typeof coupon.validFrom === 'string'
                        ? coupon.validFrom
                        : coupon.validFrom.toISOString()
                    )}
                  </Typography>
                  <Typography variant="body2">
                    to{' '}
                    {formatDate(
                      typeof coupon.validUntil === 'string'
                        ? coupon.validUntil
                        : coupon.validUntil.toISOString()
                    )}
                  </Typography>
                </TableCell>
                <TableCell>
                  {coupon.currentUses}
                  {coupon.maxTotalUses && ` / ${coupon.maxTotalUses}`}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(coupon)}
                    color={getStatusColor(coupon)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(coupon)}
                    title="Edit"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    title="Delete"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Coupon Code *"
                value={formData.code || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="SUMMER2025"
                helperText="Unique code customers will enter"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Discount Type *"
                value={formData.type || 'PERCENTAGE'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as CouponType,
                  })
                }
              >
                <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                <MenuItem value="FIXED_AMOUNT">Fixed Amount</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description *"
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Summer 2025 promotion"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={
                  formData.type === 'PERCENTAGE'
                    ? 'Discount Percentage *'
                    : 'Discount Amount *'
                }
                value={formData.discountValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountValue: Number(e.target.value),
                  })
                }
                InputProps={{
                  endAdornment: formData.type === 'PERCENTAGE' ? '%' : '$',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Purchase"
                value={formData.minimumPurchase || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minimumPurchase: Number(e.target.value) || undefined,
                  })
                }
                placeholder="0"
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Valid From *"
                value={formData.validFrom || ''}
                onChange={(e) =>
                  setFormData({ ...formData, validFrom: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Valid Until *"
                value={formData.validUntil || ''}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Total Uses"
                value={formData.maxTotalUses || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxTotalUses: Number(e.target.value) || undefined,
                  })
                }
                placeholder="Unlimited"
                helperText="Leave empty for unlimited"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Uses Per Customer"
                value={formData.maxUsesPerCustomer || 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxUsesPerCustomer: Number(e.target.value),
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.firstTimeCustomersOnly || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        firstTimeCustomersOnly: e.target.checked,
                      })
                    }
                  />
                }
                label="First-time customers only"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                multiline
                rows={2}
                placeholder="Internal notes about this coupon"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCoupon} variant="contained">
            {editingCoupon ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CouponManagement;
