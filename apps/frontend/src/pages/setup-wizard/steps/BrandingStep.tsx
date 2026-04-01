/**
 * Branding Step - Colors and customization
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
} from '@mui/material';
import { ArrowForward, ArrowBack } from '@mui/icons-material';
import { useSetupWizard } from '../SetupWizardContext';

export default function BrandingStep() {
  const { state, setBranding, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { branding } = state;

  const handleNext = () => {
    completeStep('branding');
    nextStep();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Branding
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Customize the look and feel of your booking portal. This step is
        optional.
      </Typography>
      <Grid container spacing={3}>
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Colors
              </Typography>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding({ primaryColor: e.target.value })
                      }
                      style={{
                        width: 50,
                        height: 50,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    />
                    <Box>
                      <Typography variant="subtitle2">Primary Color</Typography>
                      <TextField
                        size="small"
                        value={branding.primaryColor}
                        onChange={(e) =>
                          setBranding({ primaryColor: e.target.value })
                        }
                        sx={{ width: 120 }}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid size={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) =>
                        setBranding({ secondaryColor: e.target.value })
                      }
                      style={{
                        width: 50,
                        height: 50,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    />
                    <Box>
                      <Typography variant="subtitle2">
                        Secondary Color
                      </Typography>
                      <TextField
                        size="small"
                        value={branding.secondaryColor}
                        onChange={(e) =>
                          setBranding({ secondaryColor: e.target.value })
                        }
                        sx={{ width: 120 }}
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: 'grey.100',
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: 8,
                    bgcolor: branding.primaryColor,
                    borderRadius: 1,
                    mb: 2,
                  }}
                />
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: branding.primaryColor,
                    '&:hover': { bgcolor: branding.primaryColor },
                  }}
                >
                  Primary Button
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    ml: 1,
                    color: branding.secondaryColor,
                    borderColor: branding.secondaryColor,
                  }}
                >
                  Secondary
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
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
