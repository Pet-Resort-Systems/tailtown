/**
 * Customer Daycare Passes Component
 *
 * Displays customer's purchased daycare passes with:
 * - Pass balance summary
 * - List of active/expired passes
 * - Purchase new pass dialog
 * - Redemption history
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  Add as AddIcon,
  ConfirmationNumber as PassIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import {
  daycarePassService,
  DaycarePassPackage,
  CustomerDaycarePass,
} from "../../services/daycarePassService";

interface CustomerDaycarePassesProps {
  customerId: string;
}

const CustomerDaycarePasses: React.FC<CustomerDaycarePassesProps> = ({
  customerId,
}) => {
  const [passes, setPasses] = useState<CustomerDaycarePass[]>([]);
  const [packages, setPackages] = useState<DaycarePassPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [expandedPassId, setExpandedPassId] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalPassesRemaining: 0,
    activePasses: 0,
    expiringSoon: 0,
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [passesResponse, packagesData] = await Promise.all([
        daycarePassService.getCustomerPasses(customerId, false),
        daycarePassService.getPackages(),
      ]);

      setPasses(passesResponse.data);
      setSummary(passesResponse.summary);
      setPackages(packagesData);
    } catch (err) {
      setError("Failed to load passes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackageId) {
      setError("Please select a package");
      return;
    }

    try {
      setPurchasing(true);
      setError(null);

      await daycarePassService.purchasePass({
        customerId,
        packageId: selectedPackageId,
        notes: purchaseNotes,
      });

      setSuccess("Pass purchased successfully!");
      setPurchaseDialogOpen(false);
      setSelectedPackageId("");
      setPurchaseNotes("");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to purchase pass");
    } finally {
      setPurchasing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusChip = (pass: CustomerDaycarePass) => {
    const statusConfig = daycarePassService.formatStatus(pass.status);
    const isExpiringSoon =
      pass.status === "ACTIVE" && daycarePassService.isExpiringSoon(pass);

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Chip
          label={statusConfig.label}
          size="small"
          color={statusConfig.color}
        />
        {isExpiringSoon && (
          <Tooltip
            title={`Expires in ${daycarePassService.getDaysUntilExpiry(
              pass
            )} days`}
          >
            <WarningIcon color="warning" fontSize="small" />
          </Tooltip>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
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

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" color="primary">
                {summary.totalPassesRemaining}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Passes Remaining
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h3" color="success.main">
                {summary.activePasses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Packages
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography
                variant="h3"
                color={
                  summary.expiringSoon > 0 ? "warning.main" : "text.secondary"
                }
              >
                {summary.expiringSoon}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expiring Soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setPurchaseDialogOpen(true)}
          disabled={packages.length === 0}
        >
          Purchase Pass
        </Button>
      </Box>

      {/* Passes List */}
      {passes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <PassIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Daycare Passes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This customer hasn't purchased any daycare passes yet.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setPurchaseDialogOpen(true)}
            disabled={packages.length === 0}
          >
            Purchase First Pass
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Package</TableCell>
                <TableCell align="center">Balance</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell>Purchased</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">Price Paid</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {passes.map((pass) => (
                <React.Fragment key={pass.id}>
                  <TableRow
                    sx={{
                      opacity: pass.status === "ACTIVE" ? 1 : 0.6,
                      "& > *": {
                        borderBottom:
                          expandedPassId === pass.id ? "none" : undefined,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">
                        {pass.package.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box sx={{ flexGrow: 1, minWidth: 60 }}>
                          <LinearProgress
                            variant="determinate"
                            value={
                              (pass.passesRemaining / pass.passesPurchased) *
                              100
                            }
                            color={
                              pass.passesRemaining > 0 ? "success" : "error"
                            }
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Typography variant="body2">
                          {pass.passesRemaining}/{pass.passesPurchased}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{getStatusChip(pass)}</TableCell>
                    <TableCell>{formatDate(pass.purchasedAt)}</TableCell>
                    <TableCell>{formatDate(pass.expiresAt)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(pass.purchasePrice)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setExpandedPassId(
                            expandedPassId === pass.id ? null : pass.id
                          )
                        }
                      >
                        {expandedPassId === pass.id ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0 }}>
                      <Collapse
                        in={expandedPassId === pass.id}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box sx={{ py: 2, px: 2, bgcolor: "grey.50" }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Recent Redemptions
                          </Typography>
                          {pass.redemptions && pass.redemptions.length > 0 ? (
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Date</TableCell>
                                  <TableCell>Balance After</TableCell>
                                  <TableCell>Notes</TableCell>
                                  <TableCell>Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {pass.redemptions.map((redemption) => (
                                  <TableRow key={redemption.id}>
                                    <TableCell>
                                      {formatDate(redemption.redeemedAt)}
                                    </TableCell>
                                    <TableCell>
                                      {redemption.passesAfterUse} remaining
                                    </TableCell>
                                    <TableCell>
                                      {redemption.notes || "-"}
                                    </TableCell>
                                    <TableCell>
                                      {redemption.isReversed ? (
                                        <Chip
                                          label="Reversed"
                                          size="small"
                                          color="warning"
                                        />
                                      ) : (
                                        <Chip
                                          label="Used"
                                          size="small"
                                          color="success"
                                          icon={<CheckCircleIcon />}
                                        />
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No redemptions yet
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Purchase Dialog */}
      <Dialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Purchase Daycare Pass</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              label="Select Package"
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              sx={{ mb: 2 }}
            >
              {packages.map((pkg) => {
                const savings = daycarePassService.calculateSavings(pkg);
                return (
                  <MenuItem key={pkg.id} value={pkg.id}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <span>
                        {pkg.name} ({pkg.passCount} passes)
                      </span>
                      <span>
                        {formatCurrency(pkg.price)}
                        <Chip
                          label={`Save ${savings.percentage}%`}
                          size="small"
                          color="success"
                          sx={{ ml: 1 }}
                        />
                      </span>
                    </Box>
                  </MenuItem>
                );
              })}
            </TextField>

            {selectedPackageId && (
              <Card variant="outlined" sx={{ mb: 2, bgcolor: "primary.light" }}>
                <CardContent>
                  {(() => {
                    const pkg = packages.find(
                      (p) => p.id === selectedPackageId
                    );
                    if (!pkg) return null;
                    const savings = daycarePassService.calculateSavings(pkg);
                    return (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Package Details
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              Regular price:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography
                              variant="body2"
                              sx={{ textDecoration: "line-through" }}
                            >
                              {formatCurrency(
                                pkg.regularPricePerDay * pkg.passCount
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              Package price:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color="success.main"
                            >
                              {formatCurrency(pkg.price)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              Customer saves:
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="success.main">
                              {formatCurrency(savings.amount)} (
                              {savings.percentage}%)
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">Valid for:</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              {pkg.validityDays} days
                            </Typography>
                          </Grid>
                        </Grid>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <TextField
              fullWidth
              label="Notes (optional)"
              multiline
              rows={2}
              value={purchaseNotes}
              onChange={(e) => setPurchaseNotes(e.target.value)}
              placeholder="e.g., Paid with credit card"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePurchase}
            disabled={!selectedPackageId || purchasing}
          >
            {purchasing ? <CircularProgress size={24} /> : "Purchase"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDaycarePasses;
