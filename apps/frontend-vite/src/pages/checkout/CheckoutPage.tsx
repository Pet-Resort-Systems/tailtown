import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "../../services/api";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaymentIcon from "@mui/icons-material/Payment";
import { useShoppingCart, CartItem } from "../../contexts/ShoppingCartContext";
import OrderSummary from "../../components/cart/OrderSummary";
import PaymentStep from "./steps/PaymentStep";
import { reservationService } from "../../services/reservationService";
import { invoiceService, InvoiceLineItem } from "../../services/invoiceService";
import { paymentService } from "../../services/paymentService";
import { couponService } from "../../services/couponService";
import { Coupon } from "../../types/coupon";
import CouponInput from "../../components/coupons/CouponInput";

interface AddOn {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Explicitly include all required properties including those from CartItem
interface CartItemWithAddOns extends CartItem {
  id: string;
  price: number;
  quantity?: number;
  addOns?: AddOn[];
  serviceName?: string;
  serviceCategory?: string;
  petName?: string;
  startDate?: Date;
  endDate?: Date;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, clearCart } = useShoppingCart();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [savePaymentInfo, setSavePaymentInfo] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Use items from the shopping cart state
  const cartItems = state.items as CartItemWithAddOns[];

  useEffect(() => {
    // If cart is empty and not after a successful checkout, redirect to calendar
    if (cartItems.length === 0 && !success) {
      navigate("/calendar");
    }
  }, [cartItems, navigate, success]);

  // Calculate subtotal
  const subtotal = cartItems.reduce(
    (total: number, item: CartItemWithAddOns) => {
      // Calculate reservation price
      let itemTotal = item.price || 0;

      // Add add-ons if any
      if (item.addOns && item.addOns.length > 0) {
        itemTotal += item.addOns.reduce(
          (addOnTotal: number, addOn: AddOn) =>
            addOnTotal + addOn.price * (addOn.quantity || 1),
          0
        );
      }

      return total + itemTotal;
    },
    0
  );

  // Calculate tax (using 7.44% tax rate as per standard)
  const taxRate = 0.0744;

  // Apply coupon discount (before tax)
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const discountedTax = discountedSubtotal * taxRate;

  // Calculate total
  const total = discountedSubtotal + discountedTax;

  // Set initial payment amount when total changes
  useEffect(() => {
    // Round to 2 decimal places to ensure consistent cents display
    setPaymentAmount(parseFloat(total.toFixed(2)));
  }, [total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form based on selected payment method
    if (paymentMethod === "credit_card") {
      const form = e.target as HTMLFormElement;
      const cardNameInput = form.querySelector(
        '[name="cardName"]'
      ) as HTMLInputElement;
      const cardNumberInput = form.querySelector(
        '[name="cardNumber"]'
      ) as HTMLInputElement;
      const expiryInput = form.querySelector(
        '[name="expiry"]'
      ) as HTMLInputElement;
      const cvvInput = form.querySelector('[name="cvv"]') as HTMLInputElement;

      if (
        !cardNameInput?.value ||
        !cardNumberInput?.value ||
        !expiryInput?.value ||
        !cvvInput?.value
      ) {
        setError("Please fill in all credit card details");
        return;
      }
    }

    if (paymentAmount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }

    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Handle reservations for each cart item
      const createdReservations = [];
      for (const item of cartItems) {
        let reservation;
        let isExistingReservation = false;

        // Check if this is an existing reservation (from grooming/training calendar)
        if (item.id && item.id.startsWith("reservation-")) {
          const existingReservationId = item.id.replace("reservation-", "");

          // Only try to fetch if the ID looks like a UUID (not a timestamp)
          if (
            existingReservationId.includes("-") &&
            existingReservationId.length > 20
          ) {
            try {
              // Get the existing reservation
              const response: any = await reservationService.getReservationById(
                existingReservationId
              );

              // Handle different response formats
              if (response?.data) {
                reservation = response.data;
              } else {
                reservation = response;
              }

              isExistingReservation = true;
            } catch (error) {
              console.error("Error fetching existing reservation:", error);
              // If we can't find the existing reservation, create a new one
              reservation = null;
            }
          } else {
          }
        }

        // If no existing reservation found, create a new one
        if (!reservation) {
          // Validate required fields
          if (
            !item.customerId ||
            !item.petId ||
            !item.serviceId ||
            !item.startDate ||
            !item.endDate
          ) {
            throw new Error("Missing required reservation data");
          }

          const reservationData = {
            customerId: item.customerId,
            petId: item.petId,
            serviceId: item.serviceId,
            startDate: item.startDate.toISOString(),
            endDate: item.endDate.toISOString(),
            resourceId: item.resourceId || undefined,
            status: "CONFIRMED" as
              | "CONFIRMED"
              | "PENDING"
              | "CHECKED_IN"
              | "CHECKED_OUT"
              | "CANCELLED"
              | "COMPLETED"
              | "NO_SHOW",
            notes: item.notes || "",
          };

          const response: any = await reservationService.createReservation(
            reservationData
          );

          // Handle different response formats
          if (response?.data) {
            reservation = response.data;
          } else {
            reservation = response;
          }
        }

        createdReservations.push({
          reservation,
          originalItem: item,
          isExistingReservation,
        });
      }

      // Step 2: Create invoice for the first customer (assuming single customer checkout)
      const firstItem = cartItems[0];
      const invoiceLineItems: InvoiceLineItem[] = cartItems.map(
        (item): InvoiceLineItem => ({
          type: "SERVICE",
          description: `${item.serviceName} for ${item.petName}`,
          quantity: 1,
          unitPrice: item.price,
          amount: item.price,
          taxable: true,
          serviceId: item.serviceId,
        })
      );

      // Add add-ons as separate line items
      cartItems.forEach((item) => {
        if (item.addOns && item.addOns.length > 0) {
          item.addOns.forEach((addOn) => {
            invoiceLineItems.push({
              type: "ADD_ON",
              description: `${addOn.name} (Add-on)`,
              quantity: addOn.quantity,
              unitPrice: addOn.price,
              amount: addOn.price * addOn.quantity,
              taxable: true,
              serviceId: addOn.id,
            });
          });
        }

        // Add products as separate line items
        if (item.products && item.products.length > 0) {
          item.products.forEach((product) => {
            invoiceLineItems.push({
              type: "PRODUCT",
              description: product.name,
              quantity: product.quantity,
              unitPrice: product.price,
              amount: product.price * product.quantity,
              taxable: true,
              productId: product.id,
            });
          });
        }
      });

      const invoiceData = {
        customerId: firstItem.customerId!,
        reservationId: createdReservations[0]?.reservation?.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: discountedTax,
        discount: couponDiscount,
        total: total,
        status: "DRAFT" as
          | "DRAFT"
          | "SENT"
          | "PAID"
          | "OVERDUE"
          | "CANCELLED"
          | "REFUNDED",
        notes: appliedCoupon
          ? `Reservation checkout payment - Coupon ${appliedCoupon.code} applied`
          : "Reservation checkout payment",
        lineItems: invoiceLineItems,
      };

      const invoice = await invoiceService.createInvoice(invoiceData);

      // Step 3: Process payment (only if invoice was created successfully)
      if (invoice?.id) {
        const paymentData = {
          invoiceId: invoice.id,
          customerId: firstItem.customerId!,
          amount: paymentAmount,
          method: paymentMethod.toUpperCase() as
            | "CREDIT_CARD"
            | "DEBIT_CARD"
            | "CASH"
            | "CHECK"
            | "BANK_TRANSFER"
            | "STORE_CREDIT"
            | "GIFT_CARD",
          status: "PAID" as
            | "PENDING"
            | "PAID"
            | "FAILED"
            | "REFUNDED"
            | "PARTIALLY_REFUNDED",
          transactionId: `TXID-${Date.now()}`,
          notes: `Payment processed via ${paymentMethod}`,
        };

        await paymentService.createPayment(paymentData);

        // Step 4: Update invoice status to PAID
        await invoiceService.updateInvoice(invoice.id, {
          status: "PAID" as
            | "DRAFT"
            | "SENT"
            | "PAID"
            | "OVERDUE"
            | "CANCELLED"
            | "REFUNDED",
        });

        // Step 5: Record coupon redemption if coupon was applied
        if (appliedCoupon && couponDiscount > 0) {
          try {
            await couponService.applyCoupon(
              appliedCoupon.code,
              firstItem.customerId!,
              createdReservations[0]?.reservation?.id || "",
              subtotal
            );
          } catch (error) {
            console.error("Error recording coupon redemption:", error);
            // Don't fail the checkout if coupon recording fails
          }
        }

        // Step 6: Update reservation status to CONFIRMED for existing reservations (grooming/training)
        for (const {
          reservation,
          isExistingReservation,
        } of createdReservations) {
          if (isExistingReservation && reservation?.id) {
            try {
              await reservationService.updateReservation(reservation.id, {
                status: "CONFIRMED" as
                  | "CONFIRMED"
                  | "PENDING"
                  | "CHECKED_IN"
                  | "CHECKED_OUT"
                  | "CANCELLED"
                  | "COMPLETED"
                  | "NO_SHOW",
              });
            } catch (error) {
              console.error("Error updating reservation status:", error);
              // Don't fail the checkout if status update fails
            }
          }
        }
      }

      // Step 6: Deduct inventory for products
      for (const cartItem of state.items) {
        if (cartItem.products && cartItem.products.length > 0) {
          for (const product of cartItem.products) {
            try {
              const apiUrl = getApiBaseUrl();
              await fetch(
                `${apiUrl}/api/products/${product.id}/inventory/adjust`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-tenant-id":
                      localStorage.getItem("tailtown_tenant_id") ||
                      localStorage.getItem("tenantId") ||
                      "dev",
                  },
                  body: JSON.stringify({
                    quantity: -product.quantity, // Negative to deduct
                    changeType: "SALE",
                    reason: `Sold to customer - Invoice #${
                      invoice.invoiceNumber || invoice.id
                    }`,
                    reference: invoice.invoiceNumber || invoice.id,
                  }),
                }
              );
            } catch (error) {
              console.error(
                `Error deducting inventory for product ${product.id}:`,
                error
              );
              // Don't fail checkout if inventory deduction fails - log for manual correction
            }
          }
        }
      }

      // Process successful payment
      setSuccess(true);

      // Clear the cart after successful payment
      clearCart();

      // Trigger a calendar refresh event
      window.dispatchEvent(
        new CustomEvent("reservation-created", {
          detail: {
            reservationIds: createdReservations.map((r) => r.reservation.id),
            refreshCalendar: true,
          },
        })
      );

      // Store flag in sessionStorage to trigger refresh when calendar loads
      sessionStorage.setItem("refreshCalendar", "true");
    } catch (err: any) {
      console.error("Checkout error:", err);

      let errorMessage = "Payment processing failed. Please try again.";

      // Extract more specific error messages
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueShopping = () => {
    // Try to go back to the previous page (the calendar we came from)
    // This works better than trying to guess which calendar based on service type
    navigate(-1);
  };

  const handleCouponApplied = (coupon: Coupon, discountAmount: number) => {
    setAppliedCoupon(coupon);
    setCouponDiscount(discountAmount);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  // If payment was successful, show success message
  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h4" color="primary" gutterBottom>
            Payment Successful!
          </Typography>
          <Alert severity="success" sx={{ my: 3 }}>
            Your reservation has been confirmed. Thank you for your business!
          </Alert>
          <Typography variant="body1" paragraph>
            A confirmation email has been sent to your registered email address.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleContinueShopping}
            sx={{ mt: 2, mr: 2 }}
          >
            View Calendar
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate("/dashboard")}
            sx={{ mt: 2 }}
          >
            Go to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: "flex", alignItems: "center" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleContinueShopping}
          sx={{ mr: 2 }}
        >
          Continue Shopping
        </Button>
        <Typography variant="h4" component="h1">
          Checkout
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Order Summary - Full width at top */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Use the new OrderSummary component */}
            <OrderSummary taxRate={taxRate} />

            {/* Show discount breakdown if coupon is applied */}
            {appliedCoupon && couponDiscount > 0 && (
              <Box
                sx={{ mt: 2, p: 2, bgcolor: "success.light", borderRadius: 1 }}
              >
                <Typography variant="body2" color="success.dark">
                  <strong>Coupon Discount ({appliedCoupon.code}):</strong> -$
                  {couponDiscount.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="success.dark">
                  <strong>New Subtotal:</strong> $
                  {discountedSubtotal.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="success.dark">
                  <strong>Tax ({(taxRate * 100).toFixed(2)}%):</strong> $
                  {discountedTax.toFixed(2)}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" color="success.dark">
                  <strong>Total:</strong> ${total.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Coupon Code Section */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Promo Code
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <CouponInput
              customerId={cartItems[0]?.customerId || ""}
              subtotal={subtotal}
              serviceIds={
                cartItems
                  .map((item) => item.serviceId)
                  .filter(Boolean) as string[]
              }
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              appliedCoupon={appliedCoupon || undefined}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Payment Information - Full width below */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <form onSubmit={handleSubmit}>
              {/* Use the PaymentStep component */}
              <PaymentStep
                paymentMethod={paymentMethod}
                onPaymentMethodChange={(method) => setPaymentMethod(method)}
                paymentAmount={paymentAmount}
                onPaymentAmountChange={(amount) => setPaymentAmount(amount)}
                totalAmount={total}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={savePaymentInfo}
                        onChange={(e) => setSavePaymentInfo(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Save payment information for future bookings"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={loading}
                    startIcon={<PaymentIcon />}
                  >
                    {loading ? (
                      <CircularProgress size={24} />
                    ) : (
                      `Complete Payment - $${total.toFixed(2)}`
                    )}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CheckoutPage;
