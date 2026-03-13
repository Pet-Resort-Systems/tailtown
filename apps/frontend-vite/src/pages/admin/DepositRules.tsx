/**
 * Deposit Rules Configuration Page
 *
 * Admin interface for configuring flexible deposit rules
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
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
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  DragIndicator as DragIcon,
  AttachMoney as MoneyIcon,
  Policy as PolicyIcon,
} from "@mui/icons-material";
import { depositService } from "../../services/depositService";
import {
  DepositConfig,
  DepositRule,
  DepositRuleType,
  DepositAmountType,
  RefundPolicyType,
} from "../../types/deposit";

export const DepositRules: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Configuration state
  const [config, setConfig] = useState<DepositConfig | null>(null);
  const [rules, setRules] = useState<DepositRule[]>([]);

  // Dialog state
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<DepositRule | null>(null);

  // Form state
  const [ruleFormData, setRuleFormData] = useState<Partial<DepositRule>>({
    type: "COST_THRESHOLD",
    depositAmountType: "PERCENTAGE",
    refundPolicy: "TIERED_REFUND",
    isActive: true,
    priority: 1,
    conditions: {},
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configData, rulesData] = await Promise.all([
        depositService.getConfig(),
        depositService.getRules(),
      ]);

      setConfig(configData);
      setRules(rulesData);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load deposit configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSystem = async (enabled: boolean) => {
    try {
      setError(null);
      const updated = await depositService.toggleSystem(enabled);
      setConfig(updated);
      setSuccess(
        `Deposit system ${enabled ? "enabled" : "disabled"} successfully`
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to toggle system");
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;

    try {
      setError(null);
      const updated = await depositService.updateConfig(config);
      setConfig(updated);
      setSuccess("Configuration updated successfully");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update configuration");
    }
  };

  const handleSaveRule = async () => {
    try {
      setError(null);

      const validation = depositService.validateRule(ruleFormData);
      if (!validation.isValid) {
        setError(validation.errors.join(", "));
        return;
      }

      if (editingRule) {
        await depositService.updateRule(editingRule.id, ruleFormData);
      } else {
        await depositService.createRule(ruleFormData);
      }

      setShowRuleDialog(false);
      setEditingRule(null);
      setRuleFormData({
        type: "COST_THRESHOLD",
        depositAmountType: "PERCENTAGE",
        refundPolicy: "TIERED_REFUND",
        isActive: true,
        priority: 1,
        conditions: {},
      });
      loadData();
      setSuccess("Deposit rule saved successfully");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save deposit rule");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this deposit rule?"))
      return;

    try {
      await depositService.deleteRule(id);
      loadData();
      setSuccess("Deposit rule deleted successfully");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete deposit rule");
    }
  };

  const getRuleTypeLabel = (type: DepositRuleType): string => {
    const labels: Record<DepositRuleType, string> = {
      COST_THRESHOLD: "Cost Threshold",
      SERVICE_TYPE: "Service Type",
      ADVANCE_BOOKING: "Advance Booking",
      HOLIDAY_PEAK: "Holiday/Peak Season",
      DAY_OF_WEEK: "Day of Week",
      DURATION: "Stay Duration",
      FIRST_TIME_CUSTOMER: "First-Time Customer",
      CUSTOM: "Custom Rule",
    };
    return labels[type];
  };

  const getAmountTypeLabel = (type: DepositAmountType): string => {
    const labels: Record<DepositAmountType, string> = {
      PERCENTAGE: "Percentage",
      FIXED: "Fixed Amount",
      FULL: "Full Payment",
    };
    return labels[type];
  };

  const getRefundPolicyLabel = (policy: RefundPolicyType): string => {
    const labels: Record<RefundPolicyType, string> = {
      FULL_REFUND: "Fully Refundable",
      PARTIAL_REFUND: "Partially Refundable",
      NON_REFUNDABLE: "Non-Refundable",
      TIERED_REFUND: "Tiered Refund",
    };
    return labels[policy];
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box>
        <Alert severity="error">Failed to load deposit configuration</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Deposit Rules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure flexible deposit requirements for reservations
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={config.isEnabled}
              onChange={(e) => handleToggleSystem(e.target.checked)}
              color="primary"
            />
          }
          label={config.isEnabled ? "Enabled" : "Disabled"}
        />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{ mb: 3 }}
        >
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<PolicyIcon />} label="Deposit Rules" />
          <Tab icon={<MoneyIcon />} label="General Settings" />
        </Tabs>
      </Box>

      {/* Deposit Rules Tab */}
      {activeTab === 0 && (
        <Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography variant="h6">Deposit Rules (Priority Order)</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingRule(null);
                setRuleFormData({
                  type: "COST_THRESHOLD",
                  depositAmountType: "PERCENTAGE",
                  refundPolicy: "TIERED_REFUND",
                  isActive: true,
                  priority: rules.length + 1,
                  conditions: {},
                });
                setShowRuleDialog(true);
              }}
            >
              Add Rule
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Deposit Amount</TableCell>
                <TableCell>Refund Policy</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules
                .sort((a, b) => a.priority - b.priority)
                .map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <DragIcon
                        sx={{ color: "text.secondary", cursor: "move" }}
                      />
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {rule.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rule.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{getRuleTypeLabel(rule.type)}</TableCell>
                    <TableCell>
                      {rule.depositAmountType === "PERCENTAGE" &&
                        `${rule.depositPercentage}%`}
                      {rule.depositAmountType === "FIXED" &&
                        `$${rule.depositFixedAmount}`}
                      {rule.depositAmountType === "FULL" && "Full Payment"}
                    </TableCell>
                    <TableCell>
                      {getRefundPolicyLabel(rule.refundPolicy)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rule.isActive ? "Active" : "Inactive"}
                        color={rule.isActive ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingRule(rule);
                          setRuleFormData(rule);
                          setShowRuleDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          {rules.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                No deposit rules configured. Add your first rule to get started.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* General Settings Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Default Deposit
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.defaultDepositRequired}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          defaultDepositRequired: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Require Default Deposit"
                  sx={{ mb: 2, display: "block" }}
                />

                {config.defaultDepositRequired && (
                  <>
                    <TextField
                      fullWidth
                      select
                      label="Default Deposit Type"
                      value={config.defaultDepositType || "PERCENTAGE"}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          defaultDepositType: e.target
                            .value as DepositAmountType,
                        })
                      }
                      sx={{ mb: 2 }}
                    >
                      <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                      <MenuItem value="FIXED">Fixed Amount</MenuItem>
                      <MenuItem value="FULL">Full Payment</MenuItem>
                    </TextField>

                    <TextField
                      fullWidth
                      type="number"
                      label={
                        config.defaultDepositType === "PERCENTAGE"
                          ? "Percentage (%)"
                          : "Amount ($)"
                      }
                      value={config.defaultDepositAmount || 0}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          defaultDepositAmount: parseFloat(e.target.value),
                        })
                      }
                      sx={{ mb: 2 }}
                    />
                  </>
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
                  Payment Options
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.allowPartialPayments}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          allowPartialPayments: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Allow Partial Payments"
                  sx={{ mb: 2, display: "block" }}
                />

                {config.allowPartialPayments && (
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Partial Payment ($)"
                    value={config.minimumPartialPaymentAmount || 0}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        minimumPartialPaymentAmount: parseFloat(e.target.value),
                      })
                    }
                    sx={{ mb: 2 }}
                  />
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Reminders
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.sendDepositReminders}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          sendDepositReminders: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Send Deposit Reminders"
                  sx={{ mb: 2, display: "block" }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Rule Dialog */}
      <Dialog
        open={showRuleDialog}
        onClose={() => setShowRuleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRule ? "Edit Deposit Rule" : "Add Deposit Rule"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={ruleFormData.name || ""}
                onChange={(e) =>
                  setRuleFormData({ ...ruleFormData, name: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={ruleFormData.description || ""}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    description: e.target.value,
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Rule Type"
                value={ruleFormData.type}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    type: e.target.value as DepositRuleType,
                  })
                }
              >
                <MenuItem value="COST_THRESHOLD">Cost Threshold</MenuItem>
                <MenuItem value="SERVICE_TYPE">Service Type</MenuItem>
                <MenuItem value="ADVANCE_BOOKING">Advance Booking</MenuItem>
                <MenuItem value="HOLIDAY_PEAK">Holiday/Peak Season</MenuItem>
                <MenuItem value="DAY_OF_WEEK">Day of Week</MenuItem>
                <MenuItem value="DURATION">Stay Duration</MenuItem>
                <MenuItem value="FIRST_TIME_CUSTOMER">
                  First-Time Customer
                </MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Priority"
                value={ruleFormData.priority || 1}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    priority: parseInt(e.target.value),
                  })
                }
                helperText="Lower number = higher priority"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Deposit Amount
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Amount Type"
                value={ruleFormData.depositAmountType}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    depositAmountType: e.target.value as DepositAmountType,
                  })
                }
              >
                <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                <MenuItem value="FIXED">Fixed Amount</MenuItem>
                <MenuItem value="FULL">Full Payment</MenuItem>
              </TextField>
            </Grid>

            {ruleFormData.depositAmountType === "PERCENTAGE" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Percentage (%)"
                  value={ruleFormData.depositPercentage || 0}
                  onChange={(e) =>
                    setRuleFormData({
                      ...ruleFormData,
                      depositPercentage: parseFloat(e.target.value),
                    })
                  }
                />
              </Grid>
            )}

            {ruleFormData.depositAmountType === "FIXED" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Fixed Amount ($)"
                  value={ruleFormData.depositFixedAmount || 0}
                  onChange={(e) =>
                    setRuleFormData({
                      ...ruleFormData,
                      depositFixedAmount: parseFloat(e.target.value),
                    })
                  }
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Due Days Before Arrival"
                value={ruleFormData.depositDueDays || 0}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    depositDueDays: parseInt(e.target.value),
                  })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Refund Policy
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Refund Policy"
                value={ruleFormData.refundPolicy}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    refundPolicy: e.target.value as RefundPolicyType,
                  })
                }
              >
                <MenuItem value="FULL_REFUND">Fully Refundable</MenuItem>
                <MenuItem value="TIERED_REFUND">Tiered Refund</MenuItem>
                <MenuItem value="PARTIAL_REFUND">Partially Refundable</MenuItem>
                <MenuItem value="NON_REFUNDABLE">Non-Refundable</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleFormData.isActive}
                    onChange={(e) =>
                      setRuleFormData({
                        ...ruleFormData,
                        isActive: e.target.checked,
                      })
                    }
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
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepositRules;
