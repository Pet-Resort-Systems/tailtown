import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import CustomerSelection from '../../components/orders/CustomerSelection';
import ReservationCreation from '../../components/orders/ReservationCreation';
import AddOnSelection from '../../components/orders/AddOnSelection';
import InvoiceReview from '../../components/orders/InvoiceReview';
import PaymentProcessing from '../../components/orders/PaymentProcessing';
import { Customer } from '../../types/customer';
// Importing the Pet type from petService to ensure type consistency
import { Pet } from '../../services/petService';
import { reservationService } from '../../services/reservationService';
import { invoiceService } from '../../services/invoiceService';
import { paymentService } from '../../services/paymentService';
import priceRuleService from '../../services/priceRuleService';
import { useNavigate } from 'react-router-dom';

// Define the steps for the ordering process
const steps = [
  'Customer Information',
  'Reservation Details',
  'Add-On Services',
  'Review Invoice',
  'Process Payment'
];

// Define the order data structure
interface OrderData {
  customer: Customer | null;
  pets: Pet[];
  reservation: {
    startDate: Date | null;
    endDate: Date | null;
    serviceId: string;
    resourceId: string;
    status: string;
    notes: string;
    price?: number; // Add price property to fix TypeScript error
  };
  addOns: Array<{
    serviceId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  invoice: {
    invoiceNumber: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    depositAmount: number;
    depositRequired: boolean;
    balanceDue: number;
    notes: string;
  };
  payment: {
    method: string;
    amount: number;
    cardDetails?: {
      cardNumber: string;
      expiryDate: string;
      cvv: string;
      cardholderName: string;
    };
  };
}

const OrderEntry: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [createdReservationId, setCreatedReservationId] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Initialize order data with empty values
  const [orderData, setOrderData] = useState<OrderData>({
    customer: null,
    pets: [],
    reservation: {
      startDate: null,
      endDate: null,
      serviceId: '',
      resourceId: '',
      status: 'PENDING',
      notes: '',
    },
    addOns: [],
    invoice: {
      invoiceNumber: `INV-${Date.now()}`,
      subtotal: 0,
      taxRate: 0.0744, // 7.44% tax rate
      taxAmount: 0,
      discount: 0,
      total: 0,
      depositAmount: 0,
      depositRequired: false,
      balanceDue: 0,
      notes: '',
    },
    payment: {
      method: 'CREDIT_CARD',
      amount: 0,
    },
  });

  // Handle navigation between steps
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setOrderComplete(false);
    setCreatedReservationId(null);
    setCreatedInvoiceId(null);
    setOrderData({
      customer: null,
      pets: [],
      reservation: {
        startDate: null,
        endDate: null,
        serviceId: '',
        resourceId: '',
        status: 'PENDING',
        notes: '',
      },
      addOns: [],
      invoice: {
        invoiceNumber: `INV-${Date.now()}`,
        subtotal: 0,
        taxRate: 0.0744,
        taxAmount: 0,
        discount: 0,
        total: 0,
        depositAmount: 0,
        depositRequired: false,
        balanceDue: 0,
        notes: '',
      },
      payment: {
        method: 'CREDIT_CARD',
        amount: 0,
      },
    });
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  // Handle customer and pet selection
  const handleCustomerUpdate = (customer: Customer, pets: Pet[]) => {
    setOrderData({
      ...orderData,
      customer: customer,
      pets: pets,
    });
    handleNext();
  };

  // Handle reservation creation
  const handleReservationUpdate = async (reservationData: any) => {
    try {
      setLoading(true);
      
      // Calculate initial invoice amounts based on the service price
      const servicePrice = reservationData.price || 0;
      let subtotal = servicePrice;
      const taxRate = 0.0744; // 7.44% tax rate
      let discount = 0;
      
      // Check for applicable price rules if we have dates and service ID
      if (reservationData.serviceId && reservationData.startDate && reservationData.endDate) {
        try {
          // Format the request for the price rule service
          const priceRequest = {
            serviceId: reservationData.serviceId,
            startDate: new Date(reservationData.startDate).toISOString(),
            endDate: new Date(reservationData.endDate).toISOString(),
            petCount: 1 // Default to 1 pet
          };
          
          const priceResponse = await priceRuleService.calculatePrice(priceRequest);
          
          if (priceResponse && priceResponse.data) {
            
            // If there are applied rules, calculate the discount
            if (priceResponse.data.appliedRules && priceResponse.data.appliedRules.length > 0) {
              // Use the final price from the price rule calculation
              const originalPrice = priceResponse.data.basePrice;
              const discountedPrice = priceResponse.data.finalPrice;
              discount = originalPrice - discountedPrice;
              
            }
          }
        } catch (err) {
          console.error('Error calculating price rules:', err);
          // Continue without price rules if there's an error
        }
      }
      
      const taxAmount = (subtotal - discount) * taxRate;
      const total = subtotal - discount + taxAmount;
      
      // Calculate deposit if required
      let depositAmount = 0;
      let depositRequired = false;
      
      if (reservationData.service) {
        depositRequired = reservationData.service.depositRequired || false;
        
        if (depositRequired) {
          const depositType = reservationData.service.depositType;
          const depositValue = reservationData.service.depositAmount || 0;
          
          if (depositType === 'PERCENTAGE') {
            depositAmount = (total * depositValue) / 100;
          } else if (depositType === 'FIXED_AMOUNT') {
            depositAmount = depositValue;
          }
        }
      }
      
      const balanceDue = total - depositAmount;
      
      setOrderData({
        ...orderData,
        reservation: reservationData,
        invoice: {
          ...orderData.invoice,
          subtotal: subtotal,
          taxRate: taxRate,
          taxAmount: taxAmount,
          discount: discount,
          total: total,
          depositAmount: depositAmount,
          depositRequired: depositRequired,
          balanceDue: balanceDue,
        },
        payment: {
          ...orderData.payment,
          amount: depositRequired ? depositAmount : total,
        },
      });
      
      handleNext();
    } catch (error) {
      console.error('Error in handleReservationUpdate:', error);
      setError('Failed to process reservation details');
    } finally {
      setLoading(false);
    }
  };

  // Handle add-on selection
  const handleAddOnsUpdate = (addOns: any[]) => {
    const addOnTotal = addOns.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
    const servicePrice = orderData.reservation.price || 0;
    
    // Log the prices to help with debugging
    
    const subtotal = servicePrice + addOnTotal;
    const taxAmount = subtotal * orderData.invoice.taxRate;
    const total = subtotal + taxAmount - (orderData.invoice.discount || 0);
    
    
    setOrderData({
      ...orderData,
      addOns,
      invoice: {
        ...orderData.invoice,
        subtotal,
        taxAmount,
        total,
      },
      payment: {
        ...orderData.payment,
        amount: total,
      },
    });
    handleNext();
  };

  // Handle invoice review
  const handleInvoiceUpdate = (invoiceData: any) => {
    setOrderData({
      ...orderData,
      invoice: {
        ...orderData.invoice,
        ...invoiceData,
      },
      payment: {
        ...orderData.payment,
        amount: invoiceData.total,
      },
    });
    handleNext();
  };

  // Handle payment processing
  const handlePaymentUpdate = (paymentData: any) => {
    setOrderData({
      ...orderData,
      payment: {
        ...orderData.payment,
        ...paymentData,
      },
    });
    
    // Trigger final submission
    completeOrder();
  };

  // Complete the order process
  const completeOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!orderData.customer || orderData.pets.length === 0) {
        throw new Error('Customer and at least one pet are required');
      }
      
      // Step 1: Create reservations (one per pet)
      const createdReservations = [];
      
      // For multiple pets, we need to handle resource assignment differently
      // If a specific resource was selected and there are multiple pets, 
      // only assign it to the first pet and let backend auto-assign for others
      const hasMultiplePets = orderData.pets.length > 1;
      const hasSpecificResource = orderData.reservation.resourceId && orderData.reservation.resourceId !== '';
      
      for (let i = 0; i < orderData.pets.length; i++) {
        const pet = orderData.pets[i];
        const isFirstPet = i === 0;
        
        const reservationData: any = {
          customerId: orderData.customer.id,
          petId: pet.id,
          serviceId: orderData.reservation.serviceId,
          startDate: orderData.reservation.startDate ? new Date(orderData.reservation.startDate).toISOString() : new Date().toISOString(),
          endDate: orderData.reservation.endDate ? new Date(orderData.reservation.endDate).toISOString() : new Date().toISOString(),
          status: orderData.reservation.status as 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
          notes: orderData.reservation.notes || ''
        };
        
        // Resource assignment logic for multiple pets:
        // - If only one pet: assign the selected resource (if any)
        // - If multiple pets: don't assign specific resource, let backend auto-assign separate suites
        // This prevents conflicts where multiple pets try to use the same suite
        if (hasSpecificResource && !hasMultiplePets) {
          // Single pet - assign the selected resource
          reservationData.resourceId = orderData.reservation.resourceId;
        } else if (hasMultiplePets) {
          // Multiple pets - let backend auto-assign to avoid conflicts
        }
        
        
        const reservation = await reservationService.createReservation(reservationData);
        createdReservations.push(reservation);
      }
      
      // Store the first reservation ID for reference
      setCreatedReservationId(createdReservations[0].id);
      
      // Step 2: Create the invoice
      // Calculate the base service price (total subtotal minus add-ons)
      const addOnTotal = orderData.addOns.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
      const baseServicePrice = orderData.invoice.subtotal - addOnTotal;
      
      // Log values for debugging
      
      const invoiceData = {
        customerId: orderData.customer.id,
        reservationId: createdReservations[0].id, // Link to first reservation
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        status: 'DRAFT' as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED',
        subtotal: orderData.invoice.subtotal,
        taxRate: orderData.invoice.taxRate,
        taxAmount: orderData.invoice.taxAmount,
        discount: orderData.invoice.discount,
        total: orderData.invoice.total,
        notes: `${orderData.invoice.notes}${orderData.pets.length > 1 ? ` (${orderData.pets.length} pets: ${orderData.pets.map(p => p.name).join(', ')})` : ''}`,
        lineItems: [
          // Add main service as a line item for each pet
          ...orderData.pets.map(pet => ({
            description: `Reservation Service - ${pet.name}`,
            quantity: 1,
            unitPrice: baseServicePrice / orderData.pets.length,
            amount: baseServicePrice / orderData.pets.length,
            taxable: true
          })),
          // Add each add-on as a line item
          ...orderData.addOns.map(addon => ({
            description: addon.name,
            quantity: addon.quantity,
            unitPrice: addon.price,
            amount: addon.price * addon.quantity,
            taxable: true
          }))
        ]
      };
      
      const invoice = await invoiceService.createInvoice(invoiceData);
      if (invoice.id) {
        setCreatedInvoiceId(invoice.id);
      }
      
      // Step 3: Process payment (simulated)
      const paymentData = {
        invoiceId: invoice.id as string,
        customerId: orderData.customer.id,
        amount: orderData.payment.amount,
        method: orderData.payment.method as 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'STORE_CREDIT' | 'GIFT_CARD',
        status: 'PAID' as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED',
        transactionId: `TXID-${Date.now()}`, // Simulated transaction ID
        notes: `Payment processed via ${orderData.payment.method}`
      };
      
      await paymentService.createPayment(paymentData);
      
      // Step 4: Update invoice status to PAID
      if (invoice.id) {
        await invoiceService.updateInvoice(invoice.id, { status: 'PAID' as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED' });
      }
      
      // Order completed successfully
      setOrderComplete(true);
      setSnackbar({
        open: true,
        message: 'Order processed successfully!',
        severity: 'success',
      });
      
    } catch (err: any) {
      console.error('Error in completeOrder:', err);
      
      let errorMessage = 'An error occurred while processing the order';
      
      // Extract more specific error messages
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Log the full error for debugging
      if (err.response?.data) {
        console.error('Server error response:', err.response.data);
      }
      
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset the order form
  const handleStartNew = () => {
    handleReset();
  };

  // View customer details
  const handleViewCustomer = () => {
    if (orderData.customer?.id) {
      navigate(`/customers/${orderData.customer.id}`);
    }
  };

  // View reservation details
  const handleViewReservation = () => {
    if (createdReservationId) {
      navigate(`/reservations/${createdReservationId}`);
    }
  };

  // Render the current step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <CustomerSelection 
            onContinue={handleCustomerUpdate} 
            initialCustomer={orderData.customer}
            initialPets={orderData.pets}
          />
        );
      case 1:
        return (
          <ReservationCreation 
            onContinue={handleReservationUpdate} 
            customer={orderData.customer}
            pet={orderData.pets[0] || null}
            initialReservation={orderData.reservation}
          />
        );
      case 2:
        return (
          <AddOnSelection 
            onContinue={handleAddOnsUpdate} 
            initialAddOns={orderData.addOns}
            serviceId={orderData.reservation.serviceId}
            reservationDates={{
              startDate: orderData.reservation.startDate,
              endDate: orderData.reservation.endDate
            }}
          />
        );
      case 3:
        return (
          <InvoiceReview 
            onContinue={handleInvoiceUpdate} 
            orderData={orderData}
          />
        );
      case 4:
        return (
          <PaymentProcessing 
            onContinue={handlePaymentUpdate} 
            amount={orderData.invoice.total}
            depositRequired={orderData.invoice.depositRequired}
            depositAmount={orderData.invoice.depositAmount}
            totalAmount={orderData.invoice.total}
            initialPayment={orderData.payment}
            invoiceId={createdInvoiceId || undefined} // Pass the invoice ID to the PaymentProcessing component
          />
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          New Order Entry
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {orderComplete ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Order completed successfully!
              </Typography>
              <Typography variant="body1" paragraph>
                The reservation has been created and payment has been processed.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleViewCustomer}
                  disabled={!orderData.customer?.id}
                >
                  View Customer
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleViewReservation}
                  disabled={!createdReservationId}
                >
                  View Reservation
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleStartNew}
                >
                  Create New Order
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              {getStepContent(activeStep)}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                {activeStep !== 0 && (
                  <Button
                    disabled={loading}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                )}
                
                {activeStep < steps.length - 1 && (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={
                      (activeStep === 0 && (!orderData.customer || orderData.pets.length === 0)) ||
                      (activeStep === 1 && !orderData.reservation.serviceId) ||
                      loading
                    }
                  >
                    Next
                  </Button>
                )}
              </Box>
              
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <CircularProgress />
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default OrderEntry;
