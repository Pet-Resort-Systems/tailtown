import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Link,
  Grid,
  Card,
  CardContent,
  Collapse,
  IconButton,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  reservationService,
  Reservation,
} from "../../services/reservationService";
import {
  CalendarToday as CalendarIcon,
  Pets as PetsIcon,
  AttachMoney as MoneyIcon,
  Home as HomeIcon,
  Notes as NotesIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckInIcon,
  ExitToApp as CheckOutIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { parseGingrDate } from "../../utils/dateUtils";

const ReservationDetailsRedesigned = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const fetchReservation = useCallback(async () => {
    try {
      if (!id) return;
      const data = await reservationService.getReservationById(id);
      setReservation(data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError("Failed to load reservation");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !reservation) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error || "Reservation not found"}</Alert>
        </Box>
      </Container>
    );
  }

  const handleEdit = () => {
    navigate(`/reservations/${id}/edit`);
  };

  const handleBack = () => {
    navigate("/reservations");
  };

  const handleCancel = async () => {
    try {
      if (!id) return;
      await reservationService.updateReservation(id, { status: "CANCELLED" });
      await fetchReservation();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      setError("Failed to cancel reservation");
    }
  };

  const handleCheckIn = () => {
    if (!id) return;
    navigate(`/check-in/${id}`);
  };

  const handleCheckOut = () => {
    // Navigate to the new checkout workflow
    if (!id) return;
    navigate(`/checkout/${id}`);
  };

  const {
    startDate,
    endDate,
    status,
    notes,
    staffNotes,
    customer,
    pet,
    service,
    createdAt,
  } = reservation;

  // Helper function to format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Helper function to format short date
  // Uses parseGingrDate to handle Gingr's local-time-with-Z-suffix format
  const formatShortDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    const date = parseGingrDate(dateString);
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Calculate duration
  // Uses parseGingrDate to handle Gingr's local-time-with-Z-suffix format
  const calculateDuration = () => {
    if (!startDate || !endDate) return "N/A";
    const start = parseGingrDate(startDate);
    const end = parseGingrDate(endDate);
    if (!start || !end) return "N/A";
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} ${diffDays === 1 ? "night" : "nights"}`;
  };

  // Calculate total price
  const calculateTotal = () => {
    const basePrice = service?.price || 0;
    const addOnsTotal =
      reservation.addOnServices?.reduce(
        (total: number, addOn: { price?: number; quantity?: number }) => {
          return total + (addOn.price || 0) * (addOn.quantity || 1);
        },
        0
      ) || 0;
    const discount = reservation.discount || 0;
    const subtotal = basePrice + addOnsTotal;
    return subtotal - discount;
  };

  // Helper function to get chip color based on status
  const getStatusChipColor = (
    status: string
  ): "success" | "warning" | "info" | "default" | "error" | "secondary" => {
    switch (status) {
      case "CONFIRMED":
        return "success";
      case "PENDING":
        return "warning";
      case "CHECKED_IN":
        return "info";
      case "CHECKED_OUT":
        return "secondary";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "error";
      case "NO_SHOW":
        return "error";
      default:
        return "default";
    }
  };

  // Available statuses for the dropdown
  const availableStatuses: Array<
    | "PENDING"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW"
  > = [
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ];

  const handleStatusClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setStatusMenuAnchorEl(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchorEl(null);
  };

  const handleStatusChange = async (
    newStatus:
      | "PENDING"
      | "CONFIRMED"
      | "CHECKED_IN"
      | "CHECKED_OUT"
      | "CANCELLED"
      | "COMPLETED"
      | "NO_SHOW"
  ) => {
    if (!id) return;

    try {
      setStatusUpdateLoading(true);
      await reservationService.updateReservation(id, { status: newStatus });
      await fetchReservation();
      handleStatusMenuClose();
    } catch (err) {
      console.error("Error updating reservation status:", err);
      setError("Failed to update reservation status");
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Header with Status and Actions */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
              Reservation Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Order #{reservation.orderNumber || "Not assigned"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Chip
              label={reservation.status}
              color={getStatusChipColor(reservation.status as any)}
              sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
              onClick={handleStatusClick}
            />
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          </Box>
        </Box>

        {/* Quick Summary Card */}
        <Card
          sx={{
            mb: 3,
            bgcolor: "primary.light",
            color: "primary.contrastText",
          }}
        >
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarIcon />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Check-In
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatShortDate(startDate)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarIcon />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Check-Out
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatShortDate(endDate)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <HomeIcon />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Duration
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {calculateDuration()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <HomeIcon />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Suite
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {(() => {
                        const resource: any = reservation.resource;
                        if (!resource) return "Not assigned";
                        const suiteNum =
                          resource.suiteNumber ||
                          (resource.attributes &&
                            resource.attributes.suiteNumber);
                        return suiteNum ? `#${suiteNum}` : resource.name;
                      })()}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Left Column - Pet & Customer */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <PetsIcon color="primary" />
                <Typography variant="h6">Pet & Customer</Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">
                  Pet
                </Typography>
                <Typography variant="h6">{pet?.name || "N/A"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {pet?.type || "N/A"} • {pet?.breed || "N/A"}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="overline" color="text.secondary">
                  Owner
                </Typography>
                <Typography variant="h6">
                  {customer?.firstName || "N/A"} {customer?.lastName || ""}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    📧 {customer?.email || "N/A"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    📱 {customer?.phone || "N/A"}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Service Details */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <HomeIcon color="primary" />
                <Typography variant="h6">Service Details</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Service
                </Typography>
                <Typography variant="h6">{service?.name || "N/A"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {service?.description || ""}
                </Typography>
              </Box>

              {reservation.resource && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Assigned Suite
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      const resource: any = reservation.resource;
                      const suiteNum =
                        resource.suiteNumber ||
                        (resource.attributes &&
                          resource.attributes.suiteNumber);
                      if (suiteNum) {
                        return `Suite #${suiteNum} (${resource.type})`;
                      }
                      return `${resource.name} (${resource.type})`;
                    })()}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="overline" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1">{calculateDuration()}</Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Financial Summary - Full Width */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <MoneyIcon color="primary" />
                <Typography variant="h6">Financial Summary</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        py: 1,
                      }}
                    >
                      <Typography variant="body1">
                        {service?.name || "Service"}
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(service?.price || 0)}
                      </Typography>
                    </Box>

                    {reservation.addOnServices &&
                      reservation.addOnServices.length > 0 && (
                        <>
                          <Divider />
                          <Typography variant="overline" color="text.secondary">
                            Add-On Services
                          </Typography>
                          {reservation.addOnServices.map((addOn, index) => (
                            <Box
                              key={index}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                py: 0.5,
                                pl: 2,
                              }}
                            >
                              <Typography variant="body2">
                                {addOn.name ||
                                  addOn.addOn?.name ||
                                  "Unnamed Add-on"}
                                {addOn.quantity && addOn.quantity > 1
                                  ? ` (×${addOn.quantity})`
                                  : ""}
                              </Typography>
                              <Typography variant="body2">
                                {formatCurrency(
                                  (addOn.price || 0) * (addOn.quantity || 1)
                                )}
                              </Typography>
                            </Box>
                          ))}
                        </>
                      )}

                    {reservation.discount && reservation.discount > 0 && (
                      <>
                        <Divider />
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            py: 1,
                          }}
                        >
                          <Typography variant="body1" color="error.main">
                            Discount
                          </Typography>
                          <Typography variant="body1" color="error.main">
                            -{formatCurrency(reservation.discount)}
                          </Typography>
                        </Box>
                      </>
                    )}

                    <Divider sx={{ borderStyle: "dashed", borderWidth: 2 }} />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        py: 1,
                      }}
                    >
                      <Typography variant="h6">Total</Typography>
                      <Typography variant="h6" color="primary.main">
                        {formatCurrency(calculateTotal())}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      bgcolor: "grey.50",
                      p: 2,
                      borderRadius: 1,
                      height: "100%",
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Invoice
                    </Typography>
                    {reservation.invoice ? (
                      <Box>
                        <Link
                          href={`/invoices/${reservation.invoice.id}`}
                          sx={{ textDecoration: "none" }}
                        >
                          <Typography variant="h6" color="primary">
                            #{reservation.invoice.invoiceNumber}
                          </Typography>
                        </Link>
                        <Chip
                          label={reservation.invoice.status || "Pending"}
                          size="small"
                          color={
                            reservation.invoice.status === "PAID"
                              ? "success"
                              : "warning"
                          }
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No invoice generated
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Notes Section - Collapsible */}
          <Grid item xs={12}>
            <Paper sx={{ overflow: "hidden" }}>
              <Box
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => setNotesExpanded(!notesExpanded)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <NotesIcon color="primary" />
                  <Typography variant="h6">Notes</Typography>
                  {(notes || staffNotes) && (
                    <Chip label="Has notes" size="small" color="info" />
                  )}
                </Box>
                <IconButton
                  size="small"
                  sx={{
                    transform: notesExpanded
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
              <Collapse in={notesExpanded}>
                <Divider />
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="overline" color="text.secondary">
                        Customer Notes
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {notes || "No notes provided"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="overline" color="text.secondary">
                        Staff Notes
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {staffNotes || "No staff notes"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </Paper>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          {reservation.status === "CONFIRMED" && (
            <Button
              variant="contained"
              color="info"
              startIcon={<CheckInIcon />}
              onClick={handleCheckIn}
              size="large"
            >
              Check In
            </Button>
          )}
          {reservation.status === "CHECKED_IN" && (
            <>
              <Button
                variant="outlined"
                color="info"
                startIcon={<ViewIcon />}
                onClick={handleCheckIn}
                size="large"
              >
                View Check-In
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<CheckOutIcon />}
                onClick={handleCheckOut}
                size="large"
              >
                Check Out
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={reservation.status === "CANCELLED"}
          >
            Cancel Reservation
          </Button>
          <Button variant="outlined" onClick={handleBack}>
            Back to Reservations
          </Button>
        </Box>

        {/* Metadata Footer */}
        <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Reservation created on {formatDate(createdAt)}
          </Typography>
        </Box>
      </Box>

      {/* Status Change Menu */}
      <Menu
        anchorEl={statusMenuAnchorEl}
        open={Boolean(statusMenuAnchorEl)}
        onClose={handleStatusMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {availableStatuses.map((status) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={
              statusUpdateLoading ||
              (reservation && reservation.status === status)
            }
            sx={{
              fontSize: "0.875rem",
              py: 0.75,
              minHeight: "auto",
              color:
                reservation && reservation.status === status
                  ? "text.disabled"
                  : "inherit",
            }}
          >
            <Chip
              size="small"
              label={status}
              color={getStatusChipColor(status as any)}
              sx={{
                height: 20,
                "& .MuiChip-label": { px: 1, fontSize: "0.7rem" },
                minWidth: "80px",
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Container>
  );
};

export default ReservationDetailsRedesigned;
