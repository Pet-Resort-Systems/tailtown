/**
 * ReviewBooking - Step 6: Review and complete booking
 * Shows booking summary and handles reservation creation
 */

import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  FormControlLabel,
  Checkbox,
  TextField,
  Avatar,
  InputAdornment,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Pets as PetsIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";
import { useCustomerAuth } from "../../../contexts/CustomerAuthContext";
import { reservationService } from "../../../services/reservationService";
import {
  paymentService,
  CardPaymentRequest,
} from "../../../services/paymentService";
import tipService from "../../../services/tipService";

interface ReviewBookingProps {
  bookingData: any;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (data: any) => void;
}

const ReviewBooking: React.FC<ReviewBookingProps> = ({
  bookingData,
  onNext,
  onBack,
  onUpdate,
}) => {
  const { customer } = useCustomerAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Payment form state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState(
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim()
  );

  // Tip state
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState<string>("");
  const [tipMode, setTipMode] = useState<"percentage" | "custom" | "none">(
    "none"
  );

  // Calculate totals
  const servicePrice = bookingData.servicePrice || 0;
  const addOnTotal = bookingData.addOnTotal || 0;
  const subtotal = servicePrice + addOnTotal;
  const tax = subtotal * 0.08; // 8% tax

  // Calculate tip
  const calculateTip = (): number => {
    if (tipMode === "percentage" && tipPercentage) {
      return Math.round(subtotal * (tipPercentage / 100) * 100) / 100;
    }
    if (tipMode === "custom" && customTip) {
      return parseFloat(customTip) || 0;
    }
    return 0;
  };
  const tipAmount = calculateTip();
  const total = subtotal + tax + tipAmount;

  // Check if this is a grooming service
  const isGroomingService =
    bookingData.serviceCategory === "GROOMING" ||
    bookingData.serviceName?.toLowerCase().includes("groom");

  const TIP_PERCENTAGES = [15, 20, 25];

  const handleTipPercentageClick = (pct: number) => {
    if (tipMode === "percentage" && tipPercentage === pct) {
      setTipMode("none");
      setTipPercentage(null);
    } else {
      setTipMode("percentage");
      setTipPercentage(pct);
      setCustomTip("");
    }
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    if (value) {
      setTipMode("custom");
      setTipPercentage(null);
    } else {
      setTipMode("none");
    }
  };

  const handleCompleteBooking = async () => {
    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    // Validate payment info
    if (!cardNumber || !expiry || !cvv) {
      setError("Please enter complete payment information");
      return;
    }

    try {
      setLoading(true);
      setPaymentProcessing(true);
      setError("");

      // Process payment first
      const paymentRequest: CardPaymentRequest = {
        amount: total,
        cardNumber: cardNumber.replace(/\s/g, ""),
        expiry: expiry.replace("/", ""),
        cvv,
        name: cardName,
        email: customer?.email,
        address: customer?.address,
        city: customer?.city,
        state: customer?.state,
        zip: customer?.zipCode,
        orderId: `BOOKING-${Date.now()}`,
        capture: true,
      };

      const paymentResult = await paymentService.processCardPayment(
        paymentRequest
      );

      // Check if payment was successful
      if (
        !paymentResult ||
        paymentResult.status !== "success" ||
        !paymentResult.data?.approved
      ) {
        let errorMessage =
          paymentResult?.data?.responseText ||
          paymentResult?.message ||
          paymentResult?.error ||
          "Payment declined. Please check your card details and try again.";

        // Add helpful test card info in development
        if (process.env.NODE_ENV === "development") {
          errorMessage +=
            "\n\nTest Cards:\n• 4111111111111111 (Visa - Approved)\n• 4000000000000002 (Declined)\n• Expiry: Any future date (MM/YY)\n• CVV: Any 3 digits";
        }

        setError(errorMessage);
        setPaymentProcessing(false);
        setLoading(false);
        return;
      }

      // Payment successful, create reservation
      const reservationData = {
        customerId: bookingData.customerId,
        petId: bookingData.petIds?.[0] || "",
        serviceId: bookingData.serviceId,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        status: "CONFIRMED" as const,
        totalPrice: total,
        // Include resource type for kennel assignment (boarding services)
        suiteType: bookingData.resourceType || undefined,
        resourceId: bookingData.resourceId || undefined,
        notes: `Booked via customer portal. Pets: ${
          bookingData.petIds?.length || 0
        }. Room: ${bookingData.resourceType || "N/A"}. Payment: ${
          paymentResult.data?.transactionId
        }`,
      } as any;

      const reservation = await reservationService.createReservation(
        reservationData
      );

      // Save tip if any was added
      if (tipAmount > 0 && bookingData.customerId) {
        try {
          await tipService.createTip({
            type: isGroomingService ? "GROOMER" : "GENERAL",
            amount: tipAmount,
            percentage: tipMode === "percentage" ? tipPercentage : null,
            collectionMethod: "ONLINE",
            customerId: bookingData.customerId,
            reservationId: reservation.id,
            groomerId: isGroomingService ? bookingData.groomerId : null,
          });
        } catch (tipErr) {
          console.error("Error saving tip:", tipErr);
          // Continue anyway - tip is optional
        }
      }

      // Store reservation and payment info for confirmation
      onUpdate({
        reservationId: reservation.id,
        paymentTransactionId: paymentResult.data?.transactionId,
        paymentAuthCode: paymentResult.data?.authCode,
        maskedCard: paymentResult.data?.maskedCard,
        tipAmount,
      });

      // Move to confirmation
      onNext();
    } catch (err: any) {
      console.error("Error completing booking:", err);
      setError(
        err.response?.data?.message ||
          "Failed to complete booking. Please try again."
      );
    } finally {
      setLoading(false);
      setPaymentProcessing(false);
    }
  };

  return (
    <Box>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
          fontWeight: 600,
          mb: 3,
        }}
      >
        Review Your Booking
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Customer Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6">Customer Information</Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                {customer?.firstName} {customer?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {customer?.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {customer?.phone}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Service Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <EventIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6">Service</Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                {bookingData.serviceName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {bookingData.startDate &&
                  new Date(bookingData.startDate).toLocaleDateString()}
                {bookingData.endDate &&
                  ` - ${new Date(bookingData.endDate).toLocaleDateString()}`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pets */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <PetsIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6">Pets</Typography>
              </Box>
              <Typography variant="body1">
                {bookingData.petIds?.length || 0} pet(s) selected
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Add-Ons */}
        {bookingData.addOnIds && bookingData.addOnIds.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Add-Ons ({bookingData.addOnIds.length})
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {bookingData.addOnIds.map((id: string, index: number) => (
                    <Chip
                      key={id}
                      label={`Add-on ${index + 1}`}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Price Summary */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: "primary.50" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <MoneyIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6">Price Summary</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body1">Service</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    ${servicePrice.toFixed(2)}
                  </Typography>
                </Box>

                {addOnTotal > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">Add-Ons</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      ${addOnTotal.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${subtotal.toFixed(2)}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Tax (8%)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${tax.toFixed(2)}
                  </Typography>
                </Box>

                {tipAmount > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="body2" color="success.main">
                      Tip{" "}
                      {tipMode === "percentage" ? `(${tipPercentage}%)` : ""}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      ${tipAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6" color="primary">
                    Total
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    ${total.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Add a Tip */}
        <Grid item xs={12}>
          <Card
            sx={{
              bgcolor: "success.50",
              border: "1px solid",
              borderColor: "success.200",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar
                  sx={{ bgcolor: "success.main", mr: 2, width: 36, height: 36 }}
                >
                  <GroupsIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {isGroomingService ? "Tip for Your Groomer" : "Add a Tip"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isGroomingService
                      ? "Show appreciation for your groomer's great work"
                      : "Tips are optional and appreciated by our team"}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={1} sx={{ mb: 2 }}>
                {TIP_PERCENTAGES.map((pct) => (
                  <Grid item xs={4} key={pct}>
                    <Button
                      fullWidth
                      variant={
                        tipMode === "percentage" && tipPercentage === pct
                          ? "contained"
                          : "outlined"
                      }
                      color="success"
                      onClick={() => handleTipPercentageClick(pct)}
                      sx={{
                        py: 1.5,
                        flexDirection: "column",
                      }}
                    >
                      <Typography variant="h6" component="span">
                        {pct}%
                      </Typography>
                      <Typography variant="caption" component="span">
                        ${(subtotal * (pct / 100)).toFixed(2)}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>

              <TextField
                fullWidth
                size="small"
                label="Custom Tip Amount"
                placeholder="Enter custom amount"
                value={customTip}
                onChange={(e) => handleCustomTipChange(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
              />

              {tipAmount > 0 && (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Chip
                    label={`Tip: $${tipAmount.toFixed(2)}`}
                    color="success"
                    variant="filled"
                    onDelete={() => {
                      setTipMode("none");
                      setTipPercentage(null);
                      setCustomTip("");
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <MoneyIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6">Payment Information</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Card Number"
                    fullWidth
                    required
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, "");
                      if (/^\d{0,16}$/.test(value)) {
                        // Format as XXXX XXXX XXXX XXXX
                        const formatted =
                          value.match(/.{1,4}/g)?.join(" ") || value;
                        setCardNumber(formatted);
                      }
                    }}
                    placeholder="1234 5678 9012 3456"
                    inputProps={{ maxLength: 19 }}
                    helperText="Test: 4788250000028291 (Visa Approved)"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Expiration Date"
                    fullWidth
                    required
                    value={expiry}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + "/" + value.slice(2, 4);
                      }
                      if (value.length <= 5) {
                        setExpiry(value);
                      }
                    }}
                    placeholder="MM/YY"
                    inputProps={{ maxLength: 5 }}
                    helperText="Test: 12/25"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="CVV"
                    fullWidth
                    required
                    value={cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 4) {
                        setCvv(value);
                      }
                    }}
                    placeholder="123"
                    inputProps={{ maxLength: 4 }}
                    helperText="Test: 123"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Cardholder Name"
                    fullWidth
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  Development Mode - Test Cards Available
                </Typography>
                <Typography variant="caption">
                  Visa: 4788250000028291 | Exp: 12/25 | CVV: 123
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Terms and Conditions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      style={{ color: "#1976d2" }}
                    >
                      Terms and Conditions
                    </a>{" "}
                    and{" "}
                    <a
                      href="/cancellation-policy"
                      target="_blank"
                      style={{ color: "#1976d2" }}
                    >
                      Cancellation Policy
                    </a>
                  </Typography>
                }
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Buttons - Fixed on mobile */}
      <Box
        sx={{
          position: { xs: "fixed", sm: "static" },
          bottom: { xs: 0, sm: "auto" },
          left: { xs: 0, sm: "auto" },
          right: { xs: 0, sm: "auto" },
          p: { xs: 2, sm: 0 },
          mt: { xs: 0, sm: 4 },
          bgcolor: { xs: "background.paper", sm: "transparent" },
          boxShadow: { xs: "0 -2px 10px rgba(0,0,0,0.1)", sm: "none" },
          zIndex: { xs: 1000, sm: "auto" },
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button
          variant="outlined"
          size="large"
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          disabled={loading}
          sx={{ py: { xs: 1.5, sm: 1.5 } }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleCompleteBooking}
          disabled={!agreeToTerms || loading}
          startIcon={
            loading ? <CircularProgress size={20} /> : <CheckCircleIcon />
          }
          sx={{ py: { xs: 1.5, sm: 1.5 } }}
        >
          {loading ? "Processing..." : "Complete Booking"}
        </Button>
      </Box>

      {/* Spacer for fixed button on mobile */}
      <Box sx={{ display: { xs: "block", sm: "none" }, height: 80 }} />
    </Box>
  );
};

export default ReviewBooking;
