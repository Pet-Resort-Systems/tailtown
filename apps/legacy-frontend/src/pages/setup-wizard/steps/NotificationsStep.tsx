/**
 * Notifications Step - SendGrid & Twilio setup
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Alert,
  InputAdornment,
  IconButton,
  Slider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowForward,
  ArrowBack,
  Visibility,
  VisibilityOff,
  Email,
  Sms,
} from '@mui/icons-material';
import { useSetupWizard } from '../SetupWizardContext';

export default function NotificationsStep() {
  const { state, setNotifications, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { notifications } = state;
  const [showSendGridKey, setShowSendGridKey] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);

  const handleNext = () => {
    completeStep('notifications');
    nextStep();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Notifications
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Configure email and SMS notifications. This step is optional but
        recommended.
      </Typography>

      {/* SendGrid */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Email color="primary" />
            <Typography variant="h6">Email (SendGrid)</Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.enableEmailConfirmations}
                onChange={(e) =>
                  setNotifications({
                    enableEmailConfirmations: e.target.checked,
                  })
                }
              />
            }
            label="Enable email confirmations"
            sx={{ mb: 2 }}
          />
          {notifications.enableEmailConfirmations && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="SendGrid API Key"
                  type={showSendGridKey ? 'text' : 'password'}
                  value={notifications.sendGrid?.apiKey || ''}
                  onChange={(e) =>
                    setNotifications({
                      sendGrid: {
                        ...notifications.sendGrid,
                        apiKey: e.target.value,
                        fromEmail: notifications.sendGrid?.fromEmail || '',
                        fromName: notifications.sendGrid?.fromName || '',
                      },
                    })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowSendGridKey(!showSendGridKey)}
                          edge="end"
                        >
                          {showSendGridKey ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Email"
                  value={notifications.sendGrid?.fromEmail || ''}
                  onChange={(e) =>
                    setNotifications({
                      sendGrid: {
                        ...notifications.sendGrid,
                        fromEmail: e.target.value,
                        apiKey: notifications.sendGrid?.apiKey || '',
                        fromName: notifications.sendGrid?.fromName || '',
                      },
                    })
                  }
                  placeholder="noreply@yourbusiness.com"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Name"
                  value={notifications.sendGrid?.fromName || ''}
                  onChange={(e) =>
                    setNotifications({
                      sendGrid: {
                        ...notifications.sendGrid,
                        fromName: e.target.value,
                        apiKey: notifications.sendGrid?.apiKey || '',
                        fromEmail: notifications.sendGrid?.fromEmail || '',
                      },
                    })
                  }
                  placeholder="Your Business Name"
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Twilio */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Sms color="primary" />
            <Typography variant="h6">SMS (Twilio)</Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.enableSmsReminders}
                onChange={(e) =>
                  setNotifications({ enableSmsReminders: e.target.checked })
                }
              />
            }
            label="Enable SMS reminders"
            sx={{ mb: 2 }}
          />
          {notifications.enableSmsReminders && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Twilio Account SID"
                  value={notifications.twilio?.accountSid || ''}
                  onChange={(e) =>
                    setNotifications({
                      twilio: {
                        ...notifications.twilio,
                        accountSid: e.target.value,
                        authToken: notifications.twilio?.authToken || '',
                        phoneNumber: notifications.twilio?.phoneNumber || '',
                      },
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Auth Token"
                  type={showTwilioToken ? 'text' : 'password'}
                  value={notifications.twilio?.authToken || ''}
                  onChange={(e) =>
                    setNotifications({
                      twilio: {
                        ...notifications.twilio,
                        authToken: e.target.value,
                        accountSid: notifications.twilio?.accountSid || '',
                        phoneNumber: notifications.twilio?.phoneNumber || '',
                      },
                    })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowTwilioToken(!showTwilioToken)}
                          edge="end"
                        >
                          {showTwilioToken ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Twilio Phone Number"
                  value={notifications.twilio?.phoneNumber || ''}
                  onChange={(e) =>
                    setNotifications({
                      twilio: {
                        ...notifications.twilio,
                        phoneNumber: e.target.value,
                        accountSid: notifications.twilio?.accountSid || '',
                        authToken: notifications.twilio?.authToken || '',
                      },
                    })
                  }
                  placeholder="+15551234567"
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reminder Settings
          </Typography>
          <Typography variant="body2" gutterBottom>
            Send reminders {notifications.reminderDaysBefore} day(s) before
            reservation
          </Typography>
          <Slider
            value={notifications.reminderDaysBefore}
            onChange={(_, value) =>
              setNotifications({ reminderDaysBefore: value as number })
            }
            min={1}
            max={7}
            marks={[
              { value: 1, label: '1 day' },
              { value: 3, label: '3 days' },
              { value: 7, label: '7 days' },
            ]}
            sx={{ maxWidth: 400 }}
          />
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mb: 3 }}>
        You can configure these settings later in the admin panel if you don't
        have your API keys ready.
      </Alert>

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
