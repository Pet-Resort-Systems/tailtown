/**
 * Services Step
 *
 * Configure available services: boarding, daycare, grooming, training, etc.
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Chip,
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  Hotel,
  WbSunny,
  ContentCut,
  School,
  DirectionsWalk,
  Bathtub,
} from '@mui/icons-material';
import { useSetupWizard } from '../SetupWizardContext';
import { ServiceCategory } from '../types';

const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  BOARDING: <Hotel />,
  DAYCARE: <WbSunny />,
  GROOMING: <ContentCut />,
  TRAINING: <School />,
  WALKING: <DirectionsWalk />,
  BATHING: <Bathtub />,
  ADDON: <Chip label="Add-on" size="small" />,
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  BOARDING: '#1976d2',
  DAYCARE: '#ff9800',
  GROOMING: '#9c27b0',
  TRAINING: '#4caf50',
  WALKING: '#00bcd4',
  BATHING: '#2196f3',
  ADDON: '#757575',
};

export default function ServicesStep() {
  const { state, setServices, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { services } = state;

  const toggleService = (serviceId: string) => {
    const updatedServices = services.services.map((s) =>
      s.id === serviceId ? { ...s, enabled: !s.enabled } : s
    );
    setServices({ services: updatedServices });
  };

  const updateServiceName = (serviceId: string, name: string) => {
    const updatedServices = services.services.map((s) =>
      s.id === serviceId ? { ...s, name } : s
    );
    setServices({ services: updatedServices });
  };

  const handleNext = () => {
    const hasEnabledServices = services.services.some((s) => s.enabled);
    if (hasEnabledServices) {
      completeStep('services');
      nextStep();
    }
  };

  const groupedServices = services.services.reduce(
    (acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    },
    {} as Record<ServiceCategory, typeof services.services>
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Services
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Select the services you offer. You can customize names and add more
        later.
      </Typography>
      {/* Quick Toggles */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={services.enableDaycare}
              onChange={(e) => setServices({ enableDaycare: e.target.checked })}
            />
          }
          label="Day Camp / Daycare"
        />
        <FormControlLabel
          control={
            <Switch
              checked={services.enableGrooming}
              onChange={(e) =>
                setServices({ enableGrooming: e.target.checked })
              }
            />
          }
          label="Grooming Services"
        />
        <FormControlLabel
          control={
            <Switch
              checked={services.enableTraining}
              onChange={(e) =>
                setServices({ enableTraining: e.target.checked })
              }
            />
          }
          label="Training Classes"
        />
      </Box>
      {/* Services by Category */}
      <Grid container spacing={3}>
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <Grid key={category} size={12}>
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              >
                <Box
                  sx={{ color: CATEGORY_COLORS[category as ServiceCategory] }}
                >
                  {CATEGORY_ICONS[category as ServiceCategory]}
                </Box>
                <Typography variant="h6">
                  {category.charAt(0) + category.slice(1).toLowerCase()}
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {categoryServices.map((service) => (
                  <Grid
                    key={service.id}
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 4
                    }}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderColor: service.enabled
                          ? CATEGORY_COLORS[service.category]
                          : 'divider',
                        bgcolor: service.enabled
                          ? 'action.selected'
                          : 'background.paper',
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <TextField
                            variant="standard"
                            value={service.name}
                            onChange={(e) =>
                              updateServiceName(service.id, e.target.value)
                            }
                            disabled={!service.enabled}
                            sx={{ flexGrow: 1, mr: 2 }}
                          />
                          <Switch
                            checked={service.enabled}
                            onChange={() => toggleService(service.id)}
                            color="primary"
                          />
                        </Box>
                        {service.duration && (
                          <Typography variant="caption" color="text.secondary">
                            ~{service.duration} min
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        ))}
      </Grid>
      {/* Summary */}
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mt: 3 }}>
        <Typography variant="subtitle2">
          {services.services.filter((s) => s.enabled).length} services enabled
        </Typography>
      </Box>
      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={!services.services.some((s) => s.enabled)}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
