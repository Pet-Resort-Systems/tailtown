import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  Pets as PetsIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import {
  useOnboarding,
  OnboardingStep,
} from '../../contexts/OnboardingContext';

const STEPS: { key: OnboardingStep; label: string }[] = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'create-reservation', label: 'Reservations' },
  { key: 'check-in', label: 'Check-In' },
  { key: 'check-out', label: 'Check-Out' },
  { key: 'complete', label: 'Complete' },
];

const OnboardingWizard: React.FC = () => {
  const { state, nextStep, previousStep, skipOnboarding, completeOnboarding } =
    useOnboarding();
  if (!state.isActive) {
    return null;
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === state.currentStep);

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'welcome':
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <SchoolIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Welcome to Tailtown!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Let's take a quick tour to help you get started with the essential
              features.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This tutorial will cover:
            </Typography>
            <List dense sx={{ maxWidth: 300, mx: 'auto', mt: 2 }}>
              <ListItem>
                <ListItemIcon>
                  <DashboardIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Understanding the Dashboard" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Creating a Reservation" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PetsIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Checking In a Pet" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PaymentIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Checking Out & Payment" />
              </ListItem>
            </List>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 2, display: 'block' }}
            >
              Estimated time: 3-5 minutes
            </Typography>
          </Box>
        );

      case 'dashboard':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              📊 The Dashboard
            </Typography>
            <Typography variant="body1" paragraph>
              The Dashboard is your home base. Here you'll see:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Today's Check-Ins & Check-Outs"
                    secondary="Quick access to pets arriving and leaving today"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Occupancy Overview"
                    secondary="See how many kennels are available"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Quick Actions"
                    secondary="Fast access to common tasks"
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>
        );

      case 'create-reservation':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              📅 Creating a Reservation
            </Typography>
            <Typography variant="body1" paragraph>
              To book a pet for boarding, daycare, or grooming:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Go to Calendar or Reservations"
                    secondary="Click 'New Reservation' or click on a date"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="2. Select Customer & Pet"
                    secondary="Search for existing customer or create new"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="3. Choose Service & Dates"
                    secondary="Select boarding, daycare, grooming, or training"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="4. Assign Kennel (Optional)"
                    secondary="Pick a specific kennel or let the system auto-assign"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="5. Save Reservation"
                    secondary="The reservation appears on the calendar"
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>
        );

      case 'check-in':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              🐕 Checking In a Pet
            </Typography>
            <Typography variant="body1" paragraph>
              When a pet arrives for their stay:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Find the Reservation"
                    secondary="Use Today's Check-Ins on Dashboard or search by name"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="2. Click 'Check In'"
                    secondary="Opens the check-in workflow"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="3. Review Pet Info"
                    secondary="Verify vaccines, special needs, and emergency contacts"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="4. Record Belongings"
                    secondary="Document items the pet is bringing (leash, toys, meds)"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="5. Get Signature"
                    secondary="Customer signs the service agreement"
                  />
                </ListItem>
              </List>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              💡 Tip: Use the "Use Previous" button to quickly load belongings
              from the pet's last visit!
            </Typography>
          </Box>
        );

      case 'check-out':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              💳 Checking Out & Payment
            </Typography>
            <Typography variant="body1" paragraph>
              When a pet is ready to go home:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Find the Reservation"
                    secondary="Use Today's Check-Outs on Dashboard"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="2. Click 'Check Out'"
                    secondary="Opens the checkout workflow"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="3. Review Invoice"
                    secondary="Verify charges, add any extras (treats, baths, etc.)"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="4. Process Payment"
                    secondary="Accept card, cash, or apply store credit"
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="5. Return Belongings"
                    secondary="Check off items as you return them to the customer"
                  />
                </ListItem>
              </List>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              💡 Tip: You can email or print the receipt for the customer!
            </Typography>
          </Box>
        );

      case 'complete':
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon
              sx={{ fontSize: 80, color: 'success.main', mb: 2 }}
            />
            <Typography variant="h5" gutterBottom>
              You're All Set! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You now know the basics of using Tailtown. Here are some
              additional resources:
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, bgcolor: 'grey.50', textAlign: 'left' }}
            >
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Kennel Calendar"
                    secondary="Visual view of all kennels and reservations"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PetsIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Customers & Pets"
                    secondary="Manage customer profiles and pet records"
                  />
                </ListItem>
              </List>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              You can restart this tutorial anytime from Settings → Help →
              Restart Onboarding
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={state.isActive}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">Staff Onboarding</Typography>
        <IconButton onClick={skipOnboarding} size="small" title="Skip tutorial">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Progress Stepper */}
        <Stepper activeStep={currentStepIndex} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((step) => (
            <Step
              key={step.key}
              completed={state.completedSteps.includes(step.key)}
            >
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Button onClick={skipOnboarding} color="inherit">
          Skip Tutorial
        </Button>
        <Box>
          {currentStepIndex > 0 && state.currentStep !== 'complete' && (
            <Button
              onClick={previousStep}
              startIcon={<ArrowBackIcon />}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
          )}
          {state.currentStep === 'complete' ? (
            <Button
              variant="contained"
              color="success"
              onClick={completeOnboarding}
            >
              Get Started!
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={nextStep}
              endIcon={<ArrowForwardIcon />}
            >
              {state.currentStep === 'welcome' ? 'Start Tour' : 'Next'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingWizard;
