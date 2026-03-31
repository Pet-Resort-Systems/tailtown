import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  TextField,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Money as CashIcon,
  Receipt as CheckIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

interface PaymentMethodConfig {
  id: string;
  name: string;
  enabled: boolean;
  icon: React.ReactNode;
  description: string;
  requiresSetup: boolean;
  setupComplete: boolean;
}

const PaymentMethods: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([
    {
      id: 'CASH',
      name: 'Cash',
      enabled: true,
      icon: <CashIcon />,
      description: 'Accept cash payments at the front desk',
      requiresSetup: false,
      setupComplete: true,
    },
    {
      id: 'CHECK',
      name: 'Check',
      enabled: true,
      icon: <CheckIcon />,
      description: 'Accept check payments from customers',
      requiresSetup: false,
      setupComplete: true,
    },
    {
      id: 'CREDIT_CARD',
      name: 'Credit Card (CardConnect)',
      enabled: true,
      icon: <CreditCardIcon />,
      description:
        'Process credit card payments via CardConnect merchant service',
      requiresSetup: true,
      setupComplete: false,
    },
  ]);

  const [cardConnectConfig, setCardConnectConfig] = useState({
    merchantId: '',
    apiUsername: '',
    apiPassword: '',
    siteUrl: 'https://fts.cardconnect.com',
    testMode: true,
  });

  const [showCardConnectSetup, setShowCardConnectSetup] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTogglePaymentMethod = (methodId: string) => {
    setPaymentMethods((prev) =>
      prev.map((method) =>
        method.id === methodId
          ? { ...method, enabled: !method.enabled }
          : method
      )
    );
    setSaveSuccess(false);
  };

  const handleSaveSettings = () => {
    // In production, this would save to the backend
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveCardConnectConfig = () => {
    // Validate and save CardConnect configuration
    if (
      !cardConnectConfig.merchantId ||
      !cardConnectConfig.apiUsername ||
      !cardConnectConfig.apiPassword
    ) {
      alert('Please fill in all required CardConnect fields');
      return;
    }

    // Update the Credit Card method to show setup is complete
    setPaymentMethods((prev) =>
      prev.map((method) =>
        method.id === 'CREDIT_CARD'
          ? { ...method, setupComplete: true }
          : method
      )
    );

    setShowCardConnectSetup(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getEnabledCount = () => {
    return paymentMethods.filter((m) => m.enabled).length;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Payment Methods
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Configure which payment methods are available for transactions.
        </Typography>

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Payment method settings saved successfully!
          </Alert>
        )}

        {/* Summary Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Typography variant="h6">Active Payment Methods</Typography>
                <Typography variant="body2" color="text.secondary">
                  {getEnabledCount()} of {paymentMethods.length} methods enabled
                </Typography>
              </Grid>
              <Grid
                sx={{ textAlign: { md: 'right' } }}
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSettings}
                  size="large"
                >
                  Save Changes
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payment Methods List */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Available Payment Methods
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enable or disable payment methods for your business. Disabled
            methods will not appear in checkout.
          </Typography>

          <Divider sx={{ my: 2 }} />

          {paymentMethods.map((method, index) => (
            <Box key={method.id}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Box
                    sx={{
                      mr: 2,
                      color: method.enabled ? 'primary.main' : 'text.disabled',
                    }}
                  >
                    {method.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          color: method.enabled
                            ? 'text.primary'
                            : 'text.disabled',
                        }}
                      >
                        {method.name}
                      </Typography>
                      {method.enabled && (
                        <Chip label="Active" size="small" color="success" />
                      )}
                      {method.requiresSetup && !method.setupComplete && (
                        <Chip
                          label="Setup Required"
                          size="small"
                          color="warning"
                        />
                      )}
                      {method.requiresSetup && method.setupComplete && (
                        <Chip label="Configured" size="small" color="info" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {method.description}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {method.requiresSetup && (
                    <Button
                      size="small"
                      startIcon={<SettingsIcon />}
                      onClick={() =>
                        setShowCardConnectSetup(!showCardConnectSetup)
                      }
                    >
                      Configure
                    </Button>
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={method.enabled}
                        onChange={() => handleTogglePaymentMethod(method.id)}
                        color="primary"
                      />
                    }
                    label={method.enabled ? 'Enabled' : 'Disabled'}
                  />
                </Box>
              </Box>

              {/* CardConnect Setup Panel */}
              {method.id === 'CREDIT_CARD' && showCardConnectSetup && (
                <Box
                  sx={{
                    ml: 5,
                    mb: 2,
                    p: 3,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    CardConnect Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Enter your CardConnect merchant service credentials to
                    enable credit card processing.
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <TextField
                        label="Merchant ID"
                        value={cardConnectConfig.merchantId}
                        onChange={(e) =>
                          setCardConnectConfig({
                            ...cardConnectConfig,
                            merchantId: e.target.value,
                          })
                        }
                        fullWidth
                        required
                        size="small"
                      />
                    </Grid>
                    <Grid
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <TextField
                        label="API Username"
                        value={cardConnectConfig.apiUsername}
                        onChange={(e) =>
                          setCardConnectConfig({
                            ...cardConnectConfig,
                            apiUsername: e.target.value,
                          })
                        }
                        fullWidth
                        required
                        size="small"
                      />
                    </Grid>
                    <Grid
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <TextField
                        label="API Password"
                        type="password"
                        value={cardConnectConfig.apiPassword}
                        onChange={(e) =>
                          setCardConnectConfig({
                            ...cardConnectConfig,
                            apiPassword: e.target.value,
                          })
                        }
                        fullWidth
                        required
                        size="small"
                      />
                    </Grid>
                    <Grid
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <TextField
                        label="Site URL"
                        value={cardConnectConfig.siteUrl}
                        onChange={(e) =>
                          setCardConnectConfig({
                            ...cardConnectConfig,
                            siteUrl: e.target.value,
                          })
                        }
                        fullWidth
                        size="small"
                        helperText="CardConnect API endpoint"
                      />
                    </Grid>
                    <Grid size={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={cardConnectConfig.testMode}
                            onChange={(e) =>
                              setCardConnectConfig({
                                ...cardConnectConfig,
                                testMode: e.target.checked,
                              })
                            }
                          />
                        }
                        label="Test Mode (Use UAT environment)"
                      />
                    </Grid>
                    <Grid size={12}>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Button onClick={() => setShowCardConnectSetup(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleSaveCardConnectConfig}
                        >
                          Save Configuration
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Note:</strong> Contact CardConnect support to
                      obtain your merchant credentials. Test mode uses the UAT
                      environment for development and testing.
                    </Typography>
                  </Alert>
                </Box>
              )}

              {index < paymentMethods.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>

        {/* Help Section */}
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.light' }}>
          <Typography variant="h6" gutterBottom>
            Payment Method Guidelines
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Cash:</strong> No setup required. Staff can accept cash
            payments at the front desk.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Check:</strong> No setup required. Ensure you have a check
            acceptance policy in place.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Credit Card (CardConnect):</strong> Requires merchant
            account setup with CardConnect. Contact CardConnect to obtain your
            merchant ID and API credentials. PCI compliance is required for
            credit card processing.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default PaymentMethods;
