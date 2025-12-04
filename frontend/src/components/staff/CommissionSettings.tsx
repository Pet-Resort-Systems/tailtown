/**
 * Commission Settings Component
 * Allows configuring commission rates for staff members tied to specific services
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  InputAdornment,
  Autocomplete,
  Checkbox,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import commissionService, {
  StaffCommission,
  CreateCommissionData,
  UpdateCommissionData,
} from "../../services/commissionService";
import { serviceManagement } from "../../services/serviceManagement";

interface Service {
  id: string;
  name: string;
  price: number;
  serviceCategory: string;
}

interface CommissionSettingsProps {
  staffId: string;
  staffName: string;
}

const CommissionSettings: React.FC<CommissionSettingsProps> = ({
  staffId,
  staffName,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommission, setEditingCommission] =
    useState<StaffCommission | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commissionToDelete, setCommissionToDelete] =
    useState<StaffCommission | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    commissionType: "PERCENTAGE" | "FLAT_AMOUNT";
    commissionValue: number;
    serviceIds: string[];
    notes: string;
    isActive: boolean;
  }>({
    name: "",
    commissionType: "PERCENTAGE",
    commissionValue: 0,
    serviceIds: [],
    notes: "",
    isActive: true,
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [commissionsData, servicesData] = await Promise.all([
          commissionService.getStaffCommissions(staffId),
          serviceManagement.getAllServices().then((res: any) => res.data || []),
        ]);

        setCommissions(commissionsData);
        setServices(servicesData);
      } catch (err: any) {
        console.error("Error loading commission data:", err);
        setError("Failed to load commission data");
      } finally {
        setLoading(false);
      }
    };

    if (staffId) {
      loadData();
    }
  }, [staffId]);

  const handleOpenDialog = (commission?: StaffCommission) => {
    if (commission) {
      setEditingCommission(commission);
      setFormData({
        name: commission.name,
        commissionType: commission.commissionType,
        commissionValue: commission.commissionValue,
        serviceIds: commission.serviceCommissions.map((sc) => sc.serviceId),
        notes: commission.notes || "",
        isActive: commission.isActive,
      });
    } else {
      setEditingCommission(null);
      setFormData({
        name: "",
        commissionType: "PERCENTAGE",
        commissionValue: 0,
        serviceIds: [],
        notes: "",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCommission(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.name.trim()) {
        setError("Commission name is required");
        return;
      }

      if (formData.serviceIds.length === 0) {
        setError("Please select at least one service");
        return;
      }

      if (editingCommission) {
        // Update existing
        const updateData: UpdateCommissionData = {
          name: formData.name,
          commissionType: formData.commissionType,
          commissionValue: formData.commissionValue,
          serviceIds: formData.serviceIds,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        };

        await commissionService.updateCommission(
          editingCommission.id,
          updateData
        );
        setSuccess("Commission updated successfully");
      } else {
        // Create new
        const createData: CreateCommissionData = {
          staffId,
          name: formData.name,
          commissionType: formData.commissionType,
          commissionValue: formData.commissionValue,
          serviceIds: formData.serviceIds,
          notes: formData.notes || undefined,
        };

        await commissionService.createCommission(createData);
        setSuccess("Commission created successfully");
      }

      // Reload commissions
      const updatedCommissions = await commissionService.getStaffCommissions(
        staffId
      );
      setCommissions(updatedCommissions);
      handleCloseDialog();
    } catch (err: any) {
      console.error("Error saving commission:", err);
      setError(err.response?.data?.message || "Failed to save commission");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!commissionToDelete) return;

    try {
      setSaving(true);
      await commissionService.deleteCommission(commissionToDelete.id);
      setSuccess("Commission deleted successfully");

      // Reload commissions
      const updatedCommissions = await commissionService.getStaffCommissions(
        staffId
      );
      setCommissions(updatedCommissions);
      setDeleteConfirmOpen(false);
      setCommissionToDelete(null);
    } catch (err: any) {
      console.error("Error deleting commission:", err);
      setError("Failed to delete commission");
    } finally {
      setSaving(false);
    }
  };

  const getServiceNames = (serviceIds: string[]): string => {
    return serviceIds
      .map((id) => services.find((s) => s.id === id)?.name || "Unknown")
      .join(", ");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6">
          Commission Settings for {staffName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Commission
        </Button>
      </Box>

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

      {commissions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No commissions configured for this staff member.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ mt: 2 }}
          >
            Add First Commission
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Services</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>{commission.name}</TableCell>
                  <TableCell>
                    <Chip
                      icon={
                        commission.commissionType === "PERCENTAGE" ? (
                          <PercentIcon />
                        ) : (
                          <MoneyIcon />
                        )
                      }
                      label={
                        commission.commissionType === "PERCENTAGE"
                          ? "Percentage"
                          : "Flat Amount"
                      }
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {commissionService.formatCommissionValue(commission)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                      {getServiceNames(
                        commission.serviceCommissions.map((sc) => sc.serviceId)
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={commission.isActive ? "Active" : "Inactive"}
                      color={commission.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(commission)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setCommissionToDelete(commission);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCommission ? "Edit Commission" : "Add Commission"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Commission Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Grooming Commission, Training Commission"
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Commission Type</InputLabel>
              <Select
                value={formData.commissionType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commissionType: e.target.value as
                      | "PERCENTAGE"
                      | "FLAT_AMOUNT",
                  })
                }
                label="Commission Type"
              >
                <MenuItem value="PERCENTAGE">Percentage of Service</MenuItem>
                <MenuItem value="FLAT_AMOUNT">Flat Amount per Service</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={
                formData.commissionType === "PERCENTAGE"
                  ? "Percentage"
                  : "Amount"
              }
              type="number"
              value={formData.commissionValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  commissionValue: parseFloat(e.target.value) || 0,
                })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {formData.commissionType === "PERCENTAGE" ? "%" : "$"}
                  </InputAdornment>
                ),
              }}
              inputProps={{
                min: 0,
                max: formData.commissionType === "PERCENTAGE" ? 100 : undefined,
                step: formData.commissionType === "PERCENTAGE" ? 1 : 0.01,
              }}
              fullWidth
              required
            />

            <Autocomplete
              multiple
              options={services}
              getOptionLabel={(option) => option.name}
              value={services.filter((s) => formData.serviceIds.includes(s.id))}
              onChange={(_, newValue) =>
                setFormData({
                  ...formData,
                  serviceIds: newValue.map((s) => s.id),
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Applicable Services"
                  placeholder="Select services"
                  required
                />
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.serviceCategory} - ${option.price}
                    </Typography>
                  </Box>
                </li>
              )}
              disableCloseOnSelect
            />

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              multiline
              rows={2}
              fullWidth
            />

            {editingCommission && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                }
                label="Active"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Commission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the commission "
            {commissionToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommissionSettings;
