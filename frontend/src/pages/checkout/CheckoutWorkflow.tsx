import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { reservationService } from "../../services/reservationService";
import checkInService from "../../services/checkInService";
import FinalInvoiceReview from "../../components/checkout/FinalInvoiceReview";
import ReturnBelongings from "../../components/checkout/ReturnBelongings";
import ReturnMedications from "../../components/checkout/ReturnMedications";
import FinalPayment from "../../components/checkout/FinalPayment";
import CheckoutComplete from "../../components/checkout/CheckoutComplete";

const steps = [
  "Review Invoice",
  "Return Belongings",
  "Return Medications",
  "Final Payment",
  "Complete",
];

interface CheckoutData {
  reservationId: string;
  checkInId: string | null;
  invoice: any;
  belongings: any[];
  medications: any[];
  belongingsReturned: boolean;
  medicationsReturned: boolean;
  finalPayment: any;
}

const CheckoutWorkflow: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    reservationId: reservationId || "",
    checkInId: null,
    invoice: null,
    belongings: [],
    medications: [],
    belongingsReturned: false,
    medicationsReturned: false,
    finalPayment: null,
  });

  // Load reservation and check-in data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!reservationId) {
          setError("No reservation ID provided");
          setLoading(false);
          return;
        }

        // Load reservation with invoice
        const reservation = await reservationService.getReservationById(
          reservationId
        );

        // Load check-in data if exists
        let checkInData = null;
        try {
          const checkIns = await checkInService.getCheckInsByReservation(
            reservationId
          );
          checkInData = checkIns && checkIns.length > 0 ? checkIns[0] : null;
        } catch (err) {
          console.log("No check-in data found, continuing without it");
        }

        setCheckoutData({
          ...checkoutData,
          invoice: reservation.invoice,
          checkInId: checkInData?.id || null,
          belongings: checkInData?.belongings || [],
          medications: checkInData?.medications || [],
        });

        setLoading(false);
      } catch (err: any) {
        console.error("Error loading checkout data:", err);
        setError(err.message || "Failed to load checkout data");
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInvoiceReview = (invoiceData: any) => {
    setCheckoutData({
      ...checkoutData,
      invoice: invoiceData,
    });
    handleNext();
  };

  const handleBelongingsReturn = (belongingsData: any[]) => {
    setCheckoutData({
      ...checkoutData,
      belongings: belongingsData,
      belongingsReturned: true,
    });
    handleNext();
  };

  const handleMedicationsReturn = (medicationsData: any[]) => {
    setCheckoutData({
      ...checkoutData,
      medications: medicationsData,
      medicationsReturned: true,
    });
    handleNext();
  };

  const handleFinalPayment = async (paymentData: any) => {
    setCheckoutData({
      ...checkoutData,
      finalPayment: paymentData,
    });

    try {
      // Update reservation status to CHECKED_OUT
      await reservationService.updateReservation(reservationId!, {
        status: "CHECKED_OUT",
      });

      handleNext();
    } catch (err: any) {
      console.error("Error completing checkout:", err);
      setError(err.message || "Failed to complete checkout");
    }
  };

  const handleComplete = () => {
    // Navigate back to reservation details or dashboard
    navigate(`/reservations/${reservationId}`);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <FinalInvoiceReview
            invoice={checkoutData.invoice}
            onContinue={handleInvoiceReview}
          />
        );
      case 1:
        return (
          <ReturnBelongings
            belongings={checkoutData.belongings}
            onContinue={handleBelongingsReturn}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <ReturnMedications
            medications={checkoutData.medications}
            onContinue={handleMedicationsReturn}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <FinalPayment
            invoice={checkoutData.invoice}
            onContinue={handleFinalPayment}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <CheckoutComplete
            checkoutData={checkoutData}
            onComplete={handleComplete}
          />
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button sx={{ mt: 2 }} onClick={() => navigate("/reservations")}>
            Back to Reservations
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Checkout Process
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Complete the checkout process for this reservation
        </Typography>

        <Paper sx={{ p: 3, mt: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}
        </Paper>
      </Box>
    </Container>
  );
};

export default CheckoutWorkflow;
