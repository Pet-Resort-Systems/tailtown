/**
 * Policies Step - Cancellation, vaccinations, restrictions
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Chip,
  Slider,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowForward, ArrowBack } from '@mui/icons-material';
import { useSetupWizard } from '../SetupWizardContext';
import { DEFAULT_VACCINATIONS } from '../types';

export default function PoliciesStep() {
  const { state, setPolicies, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { policies } = state;

  const toggleVaccination = (vax: string) => {
    const required = policies.vaccinations.required.includes(vax)
      ? policies.vaccinations.required.filter((v) => v !== vax)
      : [...policies.vaccinations.required, vax];
    setPolicies({ vaccinations: { ...policies.vaccinations, required } });
  };

  const handleNext = () => {
    completeStep('policies');
    nextStep();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Policies
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Set your facility policies. These can be adjusted later.
      </Typography>

      {/* Cancellation Policy */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cancellation Policy
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Notice Required"
                type="number"
                value={policies.cancellation.hoursNotice}
                onChange={(e) =>
                  setPolicies({
                    cancellation: {
                      ...policies.cancellation,
                      hoursNotice: Number(e.target.value),
                    },
                  })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">hours</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Late Cancel Fee"
                type="number"
                value={policies.cancellation.feePercent}
                onChange={(e) =>
                  setPolicies({
                    cancellation: {
                      ...policies.cancellation,
                      feePercent: Number(e.target.value),
                    },
                  })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="No-Show Fee"
                type="number"
                value={policies.cancellation.noShowFeePercent}
                onChange={(e) =>
                  setPolicies({
                    cancellation: {
                      ...policies.cancellation,
                      noShowFeePercent: Number(e.target.value),
                    },
                  })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Vaccination Requirements */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Vaccination Requirements
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {DEFAULT_VACCINATIONS.map((vax) => (
              <Chip
                key={vax}
                label={vax}
                onClick={() => toggleVaccination(vax)}
                color={
                  policies.vaccinations.required.includes(vax)
                    ? 'primary'
                    : 'default'
                }
                variant={
                  policies.vaccinations.required.includes(vax)
                    ? 'filled'
                    : 'outlined'
                }
              />
            ))}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={policies.vaccinations.requireProof}
                    onChange={(e) =>
                      setPolicies({
                        vaccinations: {
                          ...policies.vaccinations,
                          requireProof: e.target.checked,
                        },
                      })
                    }
                  />
                }
                label="Require proof of vaccination"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Warn when expiring within{' '}
                {policies.vaccinations.expirationWarningDays} days
              </Typography>
              <Slider
                value={policies.vaccinations.expirationWarningDays}
                onChange={(_, value) =>
                  setPolicies({
                    vaccinations: {
                      ...policies.vaccinations,
                      expirationWarningDays: value as number,
                    },
                  })
                }
                min={7}
                max={90}
                marks={[
                  { value: 7, label: '7' },
                  { value: 30, label: '30' },
                  { value: 90, label: '90' },
                ]}
                sx={{ maxWidth: 300 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Age & Other Requirements */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Other Requirements
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Minimum Age"
                type="number"
                value={policies.ageRestrictions.minimumAge}
                onChange={(e) =>
                  setPolicies({
                    ageRestrictions: {
                      ...policies.ageRestrictions,
                      minimumAge: Number(e.target.value),
                    },
                  })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">months</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={policies.spayNeuterRequired}
                    onChange={(e) =>
                      setPolicies({ spayNeuterRequired: e.target.checked })
                    }
                  />
                }
                label="Require spay/neuter"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={policies.temperamentTestRequired}
                    onChange={(e) =>
                      setPolicies({ temperamentTestRequired: e.target.checked })
                    }
                  />
                }
                label="Require temperament test for new pets"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleNext}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
