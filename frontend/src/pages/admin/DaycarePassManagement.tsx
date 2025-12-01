/**
 * Daycare Pass Management Page
 *
 * Admin interface for managing daycare pass packages:
 * - View all packages
 * - Create new packages
 * - Edit existing packages
 * - Activate/deactivate packages
 */

import React, { useState, useEffect } from "react";
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
  Grid,
  Alert,
  Tooltip,
  Card,
  CardContent,
  InputAdornment,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ConfirmationNumber as PassIcon,
  Savings as SavingsIcon,
} from "@mui/icons-material";
import {
  daycarePassService,
  DaycarePassPackage,
  CreatePackageRequest,
} from "../../services/daycarePassService";

export const DaycarePassManagement: React.FC = () => {
  const [packages, setPackages] = useState<DaycarePassPackage[]>([]);
  const [, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<DaycarePassPackage | null>(null);
  const [formData, setFormData] = useState<Partial<CreatePackageRequest>>({
    passCount: 5,
    validityDays: 90,
    discountPercent: 10,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadPackages();
  }, [showInactive]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await daycarePassService.getPackages(showInactive);
      setPackages(data);
    } catch (err) {
      setError("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (pkg?: DaycarePassPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        description: pkg.description,
        passCount: pkg.passCount,
        price: pkg.price,
        regularPricePerDay: pkg.regularPricePerDay,
        discountPercent: pkg.discountPercent,
        validityDays: pkg.validityDays,
        sortOrder: pkg.sortOrder,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        passCount: 5,
        validityDays: 90,
        discountPercent: 10,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPackage(null);
    setFormData({});
    setError(null);
  };

  // Auto-calculate price when passCount, regularPricePerDay, or discountPercent changes
  const calculatePrice = () => {
    if (
      formData.passCount &&
      formData.regularPricePerDay &&
      formData.discountPercent !== undefined
    ) {
      const regularTotal = formData.passCount * formData.regularPricePerDay;
      const discountedPrice =
        regularTotal * (1 - formData.discountPercent / 100);
      return Math.round(discountedPrice * 100) / 100;
    }
    return formData.price || 0;
  };

  const handleFieldChange = (field: keyof CreatePackageRequest, value: any) => {
    const newFormData = { ...formData, [field]: value };

    // Auto-calculate price when relevant fields change
    if (
      ["passCount", "regularPricePerDay", "discountPercent"].includes(field)
    ) {
      const passCount = field === "passCount" ? value : formData.passCount;
      const regularPrice =
        field === "regularPricePerDay" ? value : formData.regularPricePerDay;
      const discount =
        field === "discountPercent" ? value : formData.discountPercent;

      if (passCount && regularPrice && discount !== undefined) {
        const regularTotal = passCount * regularPrice;
        newFormData.price =
          Math.round(regularTotal * (1 - discount / 100) * 100) / 100;
      }
    }

    setFormData(newFormData);
  };

  const handleSavePackage = async () => {
    try {
      setError(null);

      // Validation
      if (
        !formData.name ||
        !formData.passCount ||
        !formData.price ||
        !formData.regularPricePerDay ||
        !formData.validityDays
      ) {
        setError("Please fill in all required fields");
        return;
      }

      if (formData.passCount < 1) {
        setError("Pass count must be at least 1");
        return;
      }

      if (formData.validityDays < 1) {
        setError("Validity days must be at least 1");
        return;
      }

      if (editingPackage) {
        await daycarePassService.updatePackage(
          editingPackage.id,
          formData as CreatePackageRequest
        );
        setSuccess("Package updated successfully");
      } else {
        await daycarePassService.createPackage(
          formData as CreatePackageRequest
        );
        setSuccess("Package created successfully");
      }

      handleCloseDialog();
      loadPackages();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save package");
    }
  };

  const handleToggleActive = async (pkg: DaycarePassPackage) => {
    try {
      await daycarePassService.updatePackage(pkg.id, {
        isActive: !pkg.isActive,
      });
      setSuccess(
        `Package ${pkg.isActive ? "deactivated" : "activated"} successfully`
      );
      loadPackages();
    } catch (err) {
      setError("Failed to update package");
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!window.confirm("Are you sure you want to deactivate this package?")) {
      return;
    }

    try {
      await daycarePassService.deletePackage(id);
      setSuccess("Package deactivated successfully");
      loadPackages();
    } catch (err) {
      setError("Failed to deactivate package");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <PassIcon color="primary" />
            Daycare Pass Packages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure multi-day pass packages that customers can purchase for
            discounted daycare
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
            }
            label="Show inactive"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Package
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
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

      {/* Packages Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Package Name</TableCell>
              <TableCell align="center">Passes</TableCell>
              <TableCell align="right">Regular Price</TableCell>
              <TableCell align="right">Package Price</TableCell>
              <TableCell align="center">Discount</TableCell>
              <TableCell align="center">Valid For</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No packages configured. Click "Add Package" to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => {
                const savings = daycarePassService.calculateSavings(pkg);
                return (
                  <TableRow
                    key={pkg.id}
                    sx={{ opacity: pkg.isActive ? 1 : 0.6 }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{pkg.name}</Typography>
                        {pkg.description && (
                          <Typography variant="caption" color="text.secondary">
                            {pkg.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${pkg.passCount} days`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textDecoration: "line-through" }}
                      >
                        {formatCurrency(pkg.regularPricePerDay * pkg.passCount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({formatCurrency(pkg.regularPricePerDay)}/day)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="success.main">
                        {formatCurrency(pkg.price)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({formatCurrency(pkg.price / pkg.passCount)}/day)
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<SavingsIcon />}
                        label={`${savings.percentage}% off`}
                        size="small"
                        color="success"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {pkg.validityDays} days
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={pkg.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={pkg.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(pkg)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={pkg.isActive ? "Deactivate" : "Activate"}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(pkg)}
                          color={pkg.isActive ? "default" : "success"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPackage ? "Edit Package" : "Create New Package"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Package Name"
                fullWidth
                required
                value={formData.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g., 5-Day Pass, 10-Day Pass"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={formData.description || ""}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                placeholder="e.g., Save 10% with our 5-day daycare pass"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Number of Passes"
                type="number"
                fullWidth
                required
                value={formData.passCount || ""}
                onChange={(e) =>
                  handleFieldChange("passCount", parseInt(e.target.value) || 0)
                }
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Regular Day Rate"
                type="number"
                fullWidth
                required
                value={formData.regularPricePerDay || ""}
                onChange={(e) =>
                  handleFieldChange(
                    "regularPricePerDay",
                    parseFloat(e.target.value) || 0
                  )
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Discount Percent"
                type="number"
                fullWidth
                value={formData.discountPercent || 0}
                onChange={(e) =>
                  handleFieldChange(
                    "discountPercent",
                    parseFloat(e.target.value) || 0
                  )
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
                inputProps={{ min: 0, max: 100, step: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Package Price"
                type="number"
                fullWidth
                required
                value={formData.price || ""}
                onChange={(e) =>
                  handleFieldChange("price", parseFloat(e.target.value) || 0)
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Auto-calculated from discount"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Valid For (Days)"
                type="number"
                fullWidth
                required
                value={formData.validityDays || ""}
                onChange={(e) =>
                  handleFieldChange(
                    "validityDays",
                    parseInt(e.target.value) || 0
                  )
                }
                inputProps={{ min: 1 }}
                helperText="Days until pass expires after purchase"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Sort Order"
                type="number"
                fullWidth
                value={formData.sortOrder || 0}
                onChange={(e) =>
                  handleFieldChange("sortOrder", parseInt(e.target.value) || 0)
                }
                inputProps={{ min: 0 }}
                helperText="Lower numbers appear first"
              />
            </Grid>

            {/* Preview Card */}
            {formData.passCount &&
              formData.price &&
              formData.regularPricePerDay && (
                <Grid item xs={12}>
                  <Card
                    variant="outlined"
                    sx={{
                      bgcolor: "success.light",
                      color: "success.contrastText",
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Customer Savings Preview
                      </Typography>
                      <Typography variant="body2">
                        Regular:{" "}
                        {formatCurrency(
                          formData.regularPricePerDay * formData.passCount
                        )}{" "}
                        → Package: {formatCurrency(formData.price)}
                      </Typography>
                      <Typography variant="h6">
                        Save{" "}
                        {formatCurrency(
                          formData.regularPricePerDay * formData.passCount -
                            formData.price
                        )}{" "}
                        ({formData.discountPercent}% off)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePackage}>
            {editingPackage ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DaycarePassManagement;
