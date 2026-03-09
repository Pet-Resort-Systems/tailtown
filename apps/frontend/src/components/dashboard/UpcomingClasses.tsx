import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Box,
  LinearProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { School as TrainingIcon, ArrowForward as ViewAllIcon, PersonAdd as EnrollIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import schedulingService from '../../services/schedulingService';
import { customerService } from '../../services/customerService';
import { petService } from '../../services/petService';
import { TrainingClass } from '../../types/scheduling';
import { Customer } from '../../types/customer';
import { Pet } from '../../types/pet';

const UpcomingClasses: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enrollment dialog state
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedClassForEnrollment, setSelectedClassForEnrollment] = useState<TrainingClass | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [enrollmentData, setEnrollmentData] = useState({
    customerId: '',
    petId: '',
    amountPaid: 0,
    paymentMethod: 'CASH' as 'CASH' | 'CREDIT_CARD' | 'CHECK',
  });
  
  // Credit card payment dialog state
  const [creditCardDialogOpen, setCreditCardDialogOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await schedulingService.trainingClasses.getAll({
        status: 'SCHEDULED',
        isActive: true,
      });
      
      // Sort by start date and take first 6 for two-column layout
      const sorted = data
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 6);
      
      setClasses(sorted);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load classes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getEnrollmentPercentage = (current: number, max: number) => {
    return (current / max) * 100;
  };

  const getEnrollmentColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const formatTime12Hour = (time24: string) => {
    // Handle formats like "14:00" or "14:00:00"
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleOpenEnrollDialog = async (trainingClass: TrainingClass) => {
    setSelectedClassForEnrollment(trainingClass);
    setSelectedCustomer(null);
    setSelectedPet(null);
    setCustomerSearchQuery('');
    setEnrollmentData({
      customerId: '',
      petId: '',
      amountPaid: trainingClass.pricePerSeries || 0,
      paymentMethod: 'CASH',
    });
    
    // Load all customers for search
    try {
      const customersData = await customerService.getAllCustomers(1, 1000);
      setCustomers(customersData.data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
    
    setEnrollDialogOpen(true);
  };

  const handleCloseEnrollDialog = () => {
    setEnrollDialogOpen(false);
    setSelectedClassForEnrollment(null);
    setSelectedCustomer(null);
    setSelectedPet(null);
    setCustomerSearchQuery('');
    setPets([]);
    setEnrollmentData({
      customerId: '',
      petId: '',
      amountPaid: 0,
      paymentMethod: 'CASH',
    });
  };

  const handleCustomerSelect = async (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setSelectedPet(null);
    
    if (customer) {
      setEnrollmentData({ ...enrollmentData, customerId: customer.id, petId: '' });
      
      try {
        const petsData = await petService.getPetsByCustomer(customer.id);
        setPets(petsData.data || []);
      } catch (err) {
        console.error('Failed to load pets:', err);
        setPets([]);
      }
    } else {
      setEnrollmentData({ ...enrollmentData, customerId: '', petId: '' });
      setPets([]);
    }
  };

  const handlePetSelect = (pet: Pet | null) => {
    setSelectedPet(pet);
    if (pet) {
      setEnrollmentData({ ...enrollmentData, petId: pet.id });
    } else {
      setEnrollmentData({ ...enrollmentData, petId: '' });
    }
  };

  const handleEnroll = async () => {
    if (!enrollmentData.customerId || !enrollmentData.petId || !selectedClassForEnrollment) {
      setError('Please select both customer and pet');
      return;
    }

    if (enrollmentData.amountPaid <= 0) {
      setError('Payment amount must be greater than zero');
      return;
    }

    // If credit card payment, show payment processing dialog
    if (enrollmentData.paymentMethod === 'CREDIT_CARD') {
      setCreditCardDialogOpen(true);
      return;
    }

    // For cash and check, process immediately
    await processEnrollment();
  };

  const processEnrollment = async () => {
    try {
      setProcessingPayment(true);
      
      // Enroll the pet in the class
      await schedulingService.enrollments.enroll(selectedClassForEnrollment!.id, {
        customerId: enrollmentData.customerId,
        petId: enrollmentData.petId,
        amountPaid: enrollmentData.amountPaid,
      });
      
      // Refresh the class list to show updated enrollment
      await loadClasses();
      
      // Close dialogs and show success
      handleCloseEnrollDialog();
      setCreditCardDialogOpen(false);
      setError(null);
      
      // Optional: Show success message
      console.log('Enrollment successful!');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to enroll pet');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCreditCardPayment = async () => {
    // Simulate credit card processing
    setProcessingPayment(true);
    
    try {
      // In a real implementation, this would call a payment gateway (Stripe, Square, etc.)
      // For now, we'll simulate a 2-second processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process the enrollment after successful payment
      await processEnrollment();
    } catch (err: any) {
      setError('Payment processing failed. Please try again.');
      setProcessingPayment(false);
    }
  };

  const handleCloseCreditCardDialog = () => {
    if (!processingPayment) {
      setCreditCardDialogOpen(false);
    }
  };

  const calculateTotal = () => {
    return enrollmentData.amountPaid;
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Cash';
      case 'CREDIT_CARD':
        return 'Credit Card';
      case 'CHECK':
        return 'Check';
      default:
        return method;
    }
  };

  return (
    <Card>
      <CardHeader
        avatar={<TrainingIcon color="primary" />}
        title="Upcoming Training Classes"
        subheader="Active classes"
        action={
          <Button
            size="small"
            endIcon={<ViewAllIcon />}
            onClick={() => navigate('/training/classes')}
          >
            View All
          </Button>
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0, pb: 2, '&:last-child': { pb: 2 } }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : classes.length === 0 ? (
          <Typography color="textSecondary" align="center" py={2}>
            No upcoming classes
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {classes.map((trainingClass) => {
              const enrollmentPercentage = getEnrollmentPercentage(
                trainingClass.currentEnrolled,
                trainingClass.maxCapacity
              );
              
              return (
                <Grid item xs={12} md={6} key={trainingClass.id}>
                  <Box
                    sx={{
                      borderLeft: 3,
                      borderColor: 'primary.main',
                      p: 1.5,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      height: '100%',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="body2" fontWeight="medium" sx={{ flex: 1 }}>
                        {trainingClass.name}
                      </Typography>
                      <Chip label={trainingClass.level} size="small" color="primary" variant="outlined" />
                    </Box>
                    <Typography variant="caption" display="block" color="textSecondary" mb={0.5}>
                      Starts: {format(new Date(trainingClass.startDate), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary" mb={0.5}>
                      {trainingClass.totalWeeks} weeks • {trainingClass.category}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary" mb={1}>
                      {formatTime12Hour(trainingClass.startTime)} - {formatTime12Hour(trainingClass.endTime)}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        Enrollment
                      </Typography>
                      <Typography variant="caption" fontWeight="medium">
                        {trainingClass.currentEnrolled} / {trainingClass.maxCapacity}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={enrollmentPercentage}
                      color={getEnrollmentColor(enrollmentPercentage)}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                    {trainingClass._count?.waitlist && trainingClass._count.waitlist > 0 && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                        +{trainingClass._count.waitlist} on waitlist
                      </Typography>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EnrollIcon />}
                      onClick={() => handleOpenEnrollDialog(trainingClass)}
                      fullWidth
                      sx={{ mt: 1.5 }}
                      disabled={enrollmentPercentage >= 100}
                    >
                      {enrollmentPercentage >= 100 ? 'Class Full' : 'Enroll Pet'}
                    </Button>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </CardContent>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onClose={handleCloseEnrollDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Enroll Pet in {selectedClassForEnrollment?.name}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Customer Search */}
            <Autocomplete
              options={customers}
              value={selectedCustomer}
              onChange={(_, newValue) => handleCustomerSelect(newValue)}
              inputValue={customerSearchQuery}
              onInputChange={(_, newInputValue) => setCustomerSearchQuery(newInputValue)}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName} - ${option.email}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Customer"
                  placeholder="Type to search by name or email"
                  required
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">
                      {option.firstName} {option.lastName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {option.email} • {option.phone}
                    </Typography>
                  </Box>
                </li>
              )}
              noOptionsText="No customers found"
              fullWidth
            />

            {/* Pet Selection */}
            <Autocomplete
              options={pets}
              value={selectedPet}
              onChange={(_, newValue) => handlePetSelect(newValue)}
              getOptionLabel={(option) => `${option.name} (${option.breed || 'Pet'})`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Pet"
                  placeholder="Choose a pet"
                  required
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {option.breed || 'Pet'} • {option.type || 'Unknown'}
                    </Typography>
                  </Box>
                </li>
              )}
              disabled={!selectedCustomer}
              noOptionsText={selectedCustomer ? "No pets found for this customer" : "Select a customer first"}
              fullWidth
            />

            <Divider sx={{ my: 1 }} />

            {/* Payment Section */}
            <Typography variant="subtitle2" fontWeight="bold">
              Payment Information
            </Typography>

            <FormControl fullWidth required>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={enrollmentData.paymentMethod}
                onChange={(e) => setEnrollmentData({ ...enrollmentData, paymentMethod: e.target.value as any })}
                label="Payment Method"
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
                <MenuItem value="CHECK">Check</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Amount Paid"
              type="number"
              value={enrollmentData.amountPaid}
              onChange={(e) => setEnrollmentData({ ...enrollmentData, amountPaid: parseFloat(e.target.value) || 0 })}
              fullWidth
              required
              InputProps={{
                startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>,
              }}
              helperText={`Class price: $${selectedClassForEnrollment?.pricePerSeries || 0}`}
            />

            {/* Order Summary */}
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Order Summary
              </Typography>
              <List dense disablePadding>
                <ListItem disablePadding>
                  <ListItemText primary="Class" />
                  <Typography variant="body2">{selectedClassForEnrollment?.name}</Typography>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Duration" />
                  <Typography variant="body2">
                    {selectedClassForEnrollment?.totalWeeks} weeks
                  </Typography>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Payment Method" />
                  <Typography variant="body2">
                    {getPaymentMethodLabel(enrollmentData.paymentMethod)}
                  </Typography>
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem disablePadding>
                  <ListItemText 
                    primary={<Typography variant="subtitle2" fontWeight="bold">Total</Typography>} 
                  />
                  <Typography variant="subtitle2" fontWeight="bold">
                    ${calculateTotal().toFixed(2)}
                  </Typography>
                </ListItem>
              </List>
            </Box>

            {/* Class Details */}
            {selectedClassForEnrollment && (
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>Class Details:</strong><br />
                  {selectedClassForEnrollment.totalWeeks} weeks • {selectedClassForEnrollment.daysOfWeek?.length || 1} days/week<br />
                  {formatTime12Hour(selectedClassForEnrollment.startTime)} - {formatTime12Hour(selectedClassForEnrollment.endTime)}<br />
                  Capacity: {selectedClassForEnrollment.currentEnrolled} / {selectedClassForEnrollment.maxCapacity}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEnrollDialog}>Cancel</Button>
          <Button 
            onClick={handleEnroll} 
            variant="contained" 
            color="success"
            disabled={!enrollmentData.customerId || !enrollmentData.petId || enrollmentData.amountPaid <= 0}
          >
            Complete Enrollment & Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit Card Payment Dialog */}
      <Dialog 
        open={creditCardDialogOpen} 
        onClose={handleCloseCreditCardDialog}
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown={processingPayment}
      >
        <DialogTitle>
          Credit Card Payment
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Payment Summary */}
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Payment Summary
              </Typography>
              <List dense disablePadding>
                <ListItem disablePadding>
                  <ListItemText primary="Customer" />
                  <Typography variant="body2">
                    {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                  </Typography>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Pet" />
                  <Typography variant="body2">{selectedPet?.name}</Typography>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText primary="Class" />
                  <Typography variant="body2">{selectedClassForEnrollment?.name}</Typography>
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem disablePadding>
                  <ListItemText 
                    primary={<Typography variant="subtitle1" fontWeight="bold">Amount to Charge</Typography>} 
                  />
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    ${calculateTotal().toFixed(2)}
                  </Typography>
                </ListItem>
              </List>
            </Box>

            {/* Credit Card Form Placeholder */}
            <Box sx={{ p: 3, border: '2px dashed', borderColor: 'grey.300', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Credit Card Processing
              </Typography>
              <Typography variant="caption" color="textSecondary">
                In production, this would integrate with Stripe, Square, or your payment processor
              </Typography>
              {processingPayment && (
                <Box sx={{ mt: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Processing payment...
                  </Typography>
                </Box>
              )}
            </Box>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Demo Mode:</strong> Click "Process Payment" to simulate a successful credit card transaction.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreditCardDialog} disabled={processingPayment}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreditCardPayment}
            variant="contained" 
            color="primary"
            disabled={processingPayment}
          >
            {processingPayment ? 'Processing...' : 'Process Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default UpcomingClasses;
