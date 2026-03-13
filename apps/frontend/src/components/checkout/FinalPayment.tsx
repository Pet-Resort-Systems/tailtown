import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  CircularProgress,
  RadioGroup,
  Radio,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  WifiOff as OfflineIcon,
  CreditCard as CardIcon,
} from "@mui/icons-material";
import useOnlineStatus, {
  queuePendingAction,
} from "../../hooks/useOnlineStatus";
import customerPaymentMethodService, {
  SavedPaymentMethod,
} from "../../services/customerPaymentMethodService";

interface FinalPaymentProps {
  invoice: any;
  customerId?: string;
  onContinue: (paymentData: any) => void;
  onBack: () => void;
}

const FinalPayment: React.FC<FinalPaymentProps> = ({
  invoice,
  customerId,
  onContinue,
  onBack,
}) => {
  const { isOnline } = useOnlineStatus();
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentAmount, setPaymentAmount] = useState(
    invoice?.balanceDue || invoice?.total || 0
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineQueued, setOfflineQueued] = useState(false);

  // Saved cards state
  const [savedCards, setSavedCards] = useState<SavedPaymentMethod[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState(false);

  // Load saved cards when component mounts
  useEffect(() => {
    const loadSavedCards = async () => {
      if (!customerId) return;

      setLoadingCards(true);
      try {
        const cards = await customerPaymentMethodService.getPaymentMethods(
          customerId
        );
        setSavedCards(cards);
        // Auto-select default card if available
        const defaultCard = cards.find((c) => c.isDefault);
        if (defaultCard) {
          setSelectedCardId(defaultCard.id);
          setPaymentMethod("SAVED_CARD");
        }
      } catch (err) {
        console.error("Failed to load saved cards:", err);
      } finally {
        setLoadingCards(false);
      }
    };

    loadSavedCards();
  }, [customerId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const balanceDue = invoice?.balanceDue || invoice?.total || 0;
  const alreadyPaid = invoice?.depositPaid || 0;

  const handleProcessPayment = async () => {
    setProcessing(true);
    setError(null);

    // Check if offline and card payment
    if (!isOnline && paymentMethod !== "CASH") {
      setError(
        "Card payments require an internet connection. Please use cash or wait for connection to restore."
      );
      setProcessing(false);
      return;
    }

    try {
      // For cash payments while offline, queue for later sync
      if (!isOnline && paymentMethod === "CASH") {
        const paymentData = {
          method: paymentMethod,
          amount: paymentAmount,
          status: "PENDING_SYNC",
          timestamp: new Date().toISOString(),
          offlineProcessed: true,
        };

        // Queue the payment for sync when back online
        queuePendingAction({
          type: "PAYMENT",
          data: {
            invoiceId: invoice?.id,
            ...paymentData,
          },
        });

        setOfflineQueued(true);
        onContinue(paymentData);
        return;
      }

      // Handle saved card payment
      if (paymentMethod === "SAVED_CARD" && selectedCardId && customerId) {
        const chargeResult =
          await customerPaymentMethodService.chargePaymentMethod(
            customerId,
            selectedCardId,
            {
              amount: paymentAmount,
              invoiceId: invoice?.id,
              description: `Payment for Invoice ${
                invoice?.invoiceNumber || ""
              }`,
            }
          );

        const paymentData = {
          method: "SAVED_CARD",
          amount: paymentAmount,
          status: "PAID",
          timestamp: new Date().toISOString(),
          transactionId: chargeResult.transactionId,
          cardBrand: chargeResult.cardBrand,
          lastFour: chargeResult.lastFour,
        };

        onContinue(paymentData);
        return;
      }

      // Standard payment processing (cash, new card, check)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const paymentData = {
        method: paymentMethod,
        amount: paymentAmount,
        status: "PAID",
        timestamp: new Date().toISOString(),
      };

      onContinue(paymentData);
    } catch (err: any) {
      setError(err.message || "Payment processing failed");
      setProcessing(false);
    }
  };

  const canSkipPayment = balanceDue === 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Final Payment
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Collect the remaining balance from the customer
      </Typography>

      {!isOnline && (
        <Alert severity="warning" icon={<OfflineIcon />} sx={{ mt: 2 }}>
          <strong>You're offline.</strong> Cash payments can still be processed
          and will sync when connection is restored. Card payments are not
          available offline.
        </Alert>
      )}

      {offlineQueued && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Payment queued for sync when connection is restored.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, mt: 3, bgcolor: "grey.50" }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2">Total Invoice:</Typography>
              <Typography variant="body2">
                {formatCurrency(invoice?.total || 0)}
              </Typography>
            </Box>

            {alreadyPaid > 0 && (
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="success.main">
                  Deposit Paid:
                </Typography>
                <Typography variant="body2" color="success.main">
                  -{formatCurrency(alreadyPaid)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="h6" color="primary">
                Balance Due:
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(balanceDue)}
              </Typography>
            </Box>
          </Grid>

          {canSkipPayment ? (
            <Grid item xs={12}>
              <Alert severity="success">
                No payment required. The invoice has been fully paid.
              </Alert>
            </Grid>
          ) : (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentMethod}
                    label="Payment Method"
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value !== "SAVED_CARD") {
                        setSelectedCardId(null);
                      }
                    }}
                  >
                    {savedCards.length > 0 && (
                      <MenuItem value="SAVED_CARD">
                        <CardIcon sx={{ mr: 1, fontSize: 20 }} />
                        Card on File
                      </MenuItem>
                    )}
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="CREDIT_CARD">
                      Credit Card (Terminal)
                    </MenuItem>
                    <MenuItem value="DEBIT_CARD">
                      Debit Card (Terminal)
                    </MenuItem>
                    <MenuItem value="CHECK">Check</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Saved Card Selection */}
              {paymentMethod === "SAVED_CARD" && savedCards.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select a saved card:
                  </Typography>
                  {loadingCards ? (
                    <CircularProgress size={20} />
                  ) : (
                    <RadioGroup
                      value={selectedCardId || ""}
                      onChange={(e) => setSelectedCardId(e.target.value)}
                    >
                      {savedCards.map((card) => (
                        <FormControlLabel
                          key={card.id}
                          value={card.id}
                          control={<Radio />}
                          label={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <CardIcon fontSize="small" />
                              <span>
                                {customerPaymentMethodService.formatCardBrand(
                                  card.cardBrand
                                )}{" "}
                                ****{card.lastFour}
                              </span>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Exp:{" "}
                                {customerPaymentMethodService.formatExpiry(
                                  card.expiryMonth,
                                  card.expiryYear
                                )}
                              </Typography>
                              {card.isDefault && (
                                <Typography
                                  variant="caption"
                                  color="primary"
                                  sx={{ ml: 1 }}
                                >
                                  (Default)
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      ))}
                    </RadioGroup>
                  )}
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Payment Amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(parseFloat(e.target.value) || 0)
                  }
                  InputProps={{
                    startAdornment: "$",
                  }}
                  helperText={
                    paymentAmount < balanceDue
                      ? `Remaining: ${formatCurrency(
                          balanceDue - paymentAmount
                        )}`
                      : paymentAmount > balanceDue
                      ? `Overpayment: ${formatCurrency(
                          paymentAmount - balanceDue
                        )}`
                      : "Full payment"
                  }
                />
              </Grid>

              {paymentMethod === "CREDIT_CARD" && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Process credit card payment through your payment terminal
                  </Alert>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={onBack} disabled={processing}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={
            canSkipPayment
              ? () => onContinue({ method: "NONE", amount: 0, status: "PAID" })
              : handleProcessPayment
          }
          disabled={processing || (!canSkipPayment && paymentAmount <= 0)}
        >
          {processing ? (
            <CircularProgress size={24} />
          ) : canSkipPayment ? (
            "Complete Checkout"
          ) : (
            `Process Payment (${formatCurrency(paymentAmount)})`
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default FinalPayment;
