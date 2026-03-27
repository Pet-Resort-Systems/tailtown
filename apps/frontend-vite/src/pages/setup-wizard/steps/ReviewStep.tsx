/**
 * Review Step - Final review and launch
 */

import React, { useState } from 'react';
import { getApiBaseUrl } from '../../../services/api';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Business,
  MeetingRoom,
  Pets,
  AttachMoney,
  Schedule,
  People,
  CreditCard,
  Notifications,
  Palette,
  Policy,
  Launch,
} from '@mui/icons-material';
import { useSetupWizard } from '../SetupWizardContext';
import { WIZARD_STEPS } from '../types';

export default function ReviewStep() {
  const { state, prevStep, goToStep, isStepComplete } = useSetupWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredSteps = WIZARD_STEPS.filter(
    (s) => s.required && s.id !== 'review'
  );
  const allRequiredComplete = requiredSteps.every((s) => isStepComplete(s.id));

  const handleLaunch = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const apiUrl = getApiBaseUrl();

      // Submit to onboarding API
      const response = await fetch(`${apiUrl}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Onboarding failed');
      }

      // Clear wizard state from localStorage
      localStorage.removeItem('tailtown_setup_wizard');

      // Show success and redirect
      alert(
        `Success! Your facility "${state.businessInfo.name}" has been created.\n\nSubdomain: ${result.data.subdomain}\nResources: ${result.data.resourcesCreated}\nServices: ${result.data.servicesCreated}\nStaff: ${result.data.staffCreated}`
      );

      // Redirect to login for the new tenant
      window.location.href = `/login?tenant=${result.data.subdomain}`;
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getSummaryIcon = (stepId: string) => {
    const icons: Record<string, React.ReactNode> = {
      'business-info': <Business />,
      'rooms-kennels': <MeetingRoom />,
      services: <Pets />,
      pricing: <AttachMoney />,
      'operating-hours': <Schedule />,
      staff: <People />,
      payment: <CreditCard />,
      notifications: <Notifications />,
      branding: <Palette />,
      policies: <Policy />,
    };
    return icons[stepId] || <CheckCircle />;
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Review & Launch
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Review your settings before launching your facility.
      </Typography>
      {!allRequiredComplete && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please complete all required steps before launching.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Business
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {state.businessInfo.name || 'Not set'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {state.businessInfo.address &&
                  `${state.businessInfo.address}, ${state.businessInfo.city}, ${state.businessInfo.state}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {state.businessInfo.phone}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {state.businessInfo.email}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Facility
              </Typography>
              <Typography variant="body1">
                <strong>{state.roomsKennels.rooms.length}</strong> rooms,{' '}
                <strong>
                  {state.roomsKennels.rooms.reduce(
                    (sum, r) => sum + r.kennels.length,
                    0
                  )}
                </strong>{' '}
                kennels
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {state.roomsKennels.rooms.slice(0, 3).map((room) => (
                  <Chip
                    key={room.id}
                    label={room.name}
                    size="small"
                    variant="outlined"
                  />
                ))}
                {state.roomsKennels.rooms.length > 3 && (
                  <Chip
                    label={`+${state.roomsKennels.rooms.length - 3} more`}
                    size="small"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Services
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {state.services.services
                  .filter((s) => s.enabled)
                  .map((service) => (
                    <Chip
                      key={service.id}
                      label={service.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Staff
              </Typography>
              <Typography variant="body1">
                <strong>{state.staff.members.length}</strong> team members
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {state.staff.members.map((member) => (
                  <Chip
                    key={member.id}
                    label={`${member.firstName} ${member.lastName}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Divider sx={{ my: 4 }} />
      {/* Step Completion Status */}
      <Typography variant="h6" gutterBottom>
        Setup Progress
      </Typography>
      <List>
        {WIZARD_STEPS.filter((s) => s.id !== 'review').map((step) => {
          const complete = isStepComplete(step.id);
          return (
            <ListItem
              key={step.id}
              secondaryAction={
                <Button size="small" onClick={() => goToStep(step.id)}>
                  {complete ? 'Edit' : 'Complete'}
                </Button>
              }
            >
              <ListItemIcon
                sx={{ color: complete ? 'success.main' : 'text.disabled' }}
              >
                {complete ? <CheckCircle /> : getSummaryIcon(step.id)}
              </ListItemIcon>
              <ListItemText
                primary={step.title}
                secondary={step.required ? 'Required' : 'Optional'}
                primaryTypographyProps={{
                  color: complete ? 'text.primary' : 'text.secondary',
                }}
              />
            </ListItem>
          );
        })}
      </List>
      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          color="success"
          startIcon={
            isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Launch />
            )
          }
          onClick={handleLaunch}
          disabled={!allRequiredComplete || isSubmitting}
        >
          {isSubmitting ? 'Launching...' : 'Launch Your Facility'}
        </Button>
      </Box>
    </Box>
  );
}
