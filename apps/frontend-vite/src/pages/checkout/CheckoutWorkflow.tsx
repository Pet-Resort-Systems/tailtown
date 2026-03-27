import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { reservationService } from '../../services/reservationService';
import checkInService from '../../services/checkInService';
import tipService, { TipCollectionMethod } from '../../services/tipService';
import { couponService } from '../../services/couponService';
import FinalInvoiceReview from '../../components/checkout/FinalInvoiceReview';
import ReturnBelongings from '../../components/checkout/ReturnBelongings';
import ReturnMedications from '../../components/checkout/ReturnMedications';
import TipSelection, { TipData } from '../../components/checkout/TipSelection';
import FinalPayment from '../../components/checkout/FinalPayment';
import CheckoutComplete from '../../components/checkout/CheckoutComplete';

const steps = [
  'Review Invoice',
  'Return Belongings',
  'Return Medications',
  'Add Tip',
  'Final Payment',
  'Complete',
];

interface CheckoutData {
  reservationId: string;
  checkInId: string | null;
  invoice: any;
  belongings: any[];
  medications: any[];
  belongingsReturned: boolean;
  medicationsReturned: boolean;
  tipData: TipData | null;
  groomer: { id: string; firstName: string; lastName: string } | null;
  hasGroomingService: boolean;
  finalPayment: any;
  permanentCoupon: any | null;
}

const CheckoutWorkflow: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    reservationId: reservationId || '',
    checkInId: null,
    invoice: null,
    belongings: [],
    medications: [],
    belongingsReturned: false,
    medicationsReturned: false,
    tipData: null,
    groomer: null,
    hasGroomingService: false,
    finalPayment: null,
    permanentCoupon: null,
  });

  // Load reservation and check-in data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!reservationId) {
          setError('No reservation ID provided');
          setLoading(false);
          return;
        }

        // Load reservation with invoice
        const reservation =
          await reservationService.getReservationById(reservationId);

        // Load check-in data if exists
        let checkInData = null;
        try {
          const checkIns =
            await checkInService.getCheckInsByReservation(reservationId);
          checkInData = checkIns && checkIns.length > 0 ? checkIns[0] : null;
        } catch (err) {}

        // Check if this is a grooming service and get groomer info
        const serviceData = reservation.service as any;
        const hasGroomingService =
          serviceData?.category === 'GROOMING' ||
          serviceData?.name?.toLowerCase().includes('groom') ||
          false;

        // Get groomer from reservation if assigned
        const reservationData = reservation as any;
        const groomerData =
          reservationData.assignedStaff || reservationData.groomer || null;

        // Check for customer's permanent discount coupon
        let permanentCoupon = null;
        const customerId =
          reservationData.customerId || reservationData.customer?.id;
        if (customerId) {
          try {
            permanentCoupon =
              await couponService.getCustomerPermanentCoupon(customerId);
          } catch (err) {}
        }

        setCheckoutData({
          ...checkoutData,
          invoice: reservation.invoice,
          checkInId: checkInData?.id || null,
          belongings: checkInData?.belongings || [],
          medications: checkInData?.medications || [],
          hasGroomingService,
          groomer: groomerData
            ? {
                id: groomerData.id,
                firstName: groomerData.firstName,
                lastName: groomerData.lastName,
              }
            : null,
          permanentCoupon,
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading checkout data:', err);
        setError(err.message || 'Failed to load checkout data');
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

  const handleTipsSelected = async (tipData: TipData) => {
    setCheckoutData({
      ...checkoutData,
      tipData,
    });

    // Save tips to the database
    try {
      const tipsToCreate = [];
      const customerId = checkoutData.invoice?.customerId;

      if (tipData.groomerTip && tipData.groomerId && customerId) {
        tipsToCreate.push({
          type: 'GROOMER' as const,
          amount: tipData.groomerTip,
          percentage: tipData.groomerTipPercentage,
          collectionMethod: 'TERMINAL' as TipCollectionMethod,
          customerId,
          reservationId: checkoutData.reservationId,
          groomerId: tipData.groomerId,
        });
      }

      if (tipData.generalTip && customerId) {
        tipsToCreate.push({
          type: 'GENERAL' as const,
          amount: tipData.generalTip,
          percentage: tipData.generalTipPercentage,
          collectionMethod: 'TERMINAL' as TipCollectionMethod,
          customerId,
          reservationId: checkoutData.reservationId,
        });
      }

      if (tipsToCreate.length > 0) {
        await tipService.createTips(tipsToCreate);
      }
    } catch (err) {
      console.error('Error saving tips:', err);
      // Continue anyway - tips are optional
    }

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
        status: 'CHECKED_OUT',
      });

      handleNext();
    } catch (err: any) {
      console.error('Error completing checkout:', err);
      setError(err.message || 'Failed to complete checkout');
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
          <TipSelection
            subtotal={checkoutData.invoice?.total || 0}
            groomer={checkoutData.groomer}
            hasGroomingService={checkoutData.hasGroomingService}
            onTipsSelected={handleTipsSelected}
            onBack={handleBack}
            onSkip={() =>
              handleTipsSelected({
                groomerTip: null,
                groomerTipPercentage: null,
                groomerId: null,
                generalTip: null,
                generalTipPercentage: null,
                totalTips: 0,
              })
            }
          />
        );
      case 4:
        return (
          <FinalPayment
            invoice={checkoutData.invoice}
            onContinue={handleFinalPayment}
            onBack={handleBack}
          />
        );
      case 5:
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
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
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
          <Button sx={{ mt: 2 }} onClick={() => navigate('/reservations')}>
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
