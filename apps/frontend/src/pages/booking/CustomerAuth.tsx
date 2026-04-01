/**
 * CustomerAuth - Login/Signup for booking portal
 * Mobile-optimized authentication flow
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Grid,
  Link,
} from '@mui/material';
import {
  Login as LoginIcon,
  PersonAdd as SignupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';

interface CustomerAuthProps {
  onSuccess: () => void;
}

const CustomerAuth: React.FC<CustomerAuthProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { login, signup } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [error, setError] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      setError('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      await login(loginEmail, loginPassword);
      onSuccess();
    } catch (err: any) {
      // Check if customer needs to set up password
      if (err.message === 'PASSWORD_NOT_SET') {
        setNeedsPasswordSetup(true);
        setError(
          "You need to set up a password. Please use the 'Forgot Password' link below."
        );
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (
      !signupData.firstName ||
      !signupData.lastName ||
      !signupData.email ||
      !signupData.phone
    ) {
      setError('Please fill in all required fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!signupData.password || signupData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signup(signupData);
      onSuccess();
    } catch (err: any) {
      if (err.message === 'CUSTOMER_EXISTS') {
        setError(
          "An account with this email already exists. Please use the Login tab and click 'Forgot password?' to set up your password."
        );
        setActiveTab(0); // Switch to login tab
        setLoginEmail(signupData.email); // Pre-fill email
      } else {
        setError(err.message || 'Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignupChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setSignupData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          textAlign: 'center',
          fontWeight: 700,
          mb: 3,
          fontSize: { xs: '1.75rem', sm: '2.125rem' },
        }}
      >
        Welcome to Tailtown
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ textAlign: 'center', mb: 4 }}
      >
        Please sign in or create an account to continue booking
      </Typography>
      <Card elevation={3}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            setError('');
          }}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Login" />
          <Tab label="Create Account" />
        </Tabs>

        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Login Tab */}
          {activeTab === 0 && (
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                sx={{ mb: 3 }}
                autoComplete="email"
                InputLabelProps={{ shrink: true }}
                placeholder="Enter your email"
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                sx={{ mb: 2 }}
                autoComplete="current-password"
                InputLabelProps={{ shrink: true }}
                placeholder="Enter your password"
              />

              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => navigate('/book/forgot-password')}
                  sx={{
                    cursor: 'pointer',
                    ...(needsPasswordSetup && {
                      fontWeight: 'bold',
                      color: 'primary.main',
                    }),
                  }}
                >
                  {needsPasswordSetup
                    ? 'Set up your password →'
                    : 'Forgot password?'}
                </Link>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <LoginIcon />
                }
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Box>
          )}

          {/* Signup Tab */}
          {activeTab === 1 && (
            <Box component="form" onSubmit={handleSignup}>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontSize: '1rem', fontWeight: 600 }}
                  >
                    Personal Information
                  </Typography>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    label="First Name"
                    fullWidth
                    required
                    value={signupData.firstName}
                    onChange={handleSignupChange('firstName')}
                    autoComplete="given-name"
                  />
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    required
                    value={signupData.lastName}
                    onChange={handleSignupChange('lastName')}
                    autoComplete="family-name"
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    required
                    value={signupData.email}
                    onChange={handleSignupChange('email')}
                    autoComplete="email"
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    label="Phone Number"
                    type="tel"
                    fullWidth
                    required
                    value={signupData.phone}
                    onChange={handleSignupChange('phone')}
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                  />
                </Grid>

                <Grid size={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontSize: '1rem', fontWeight: 600, mt: 2 }}
                  >
                    Create Password
                  </Typography>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    required
                    value={signupData.password}
                    onChange={handleSignupChange('password')}
                    helperText="At least 6 characters"
                    autoComplete="new-password"
                  />
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    label="Confirm Password"
                    type="password"
                    fullWidth
                    required
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange('confirmPassword')}
                    autoComplete="new-password"
                  />
                </Grid>

                <Grid size={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontSize: '1rem', fontWeight: 600, mt: 2 }}
                  >
                    Address (Optional)
                  </Typography>
                </Grid>

                <Grid size={12}>
                  <TextField
                    label="Street Address"
                    fullWidth
                    value={signupData.address}
                    onChange={handleSignupChange('address')}
                    autoComplete="street-address"
                  />
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    label="City"
                    fullWidth
                    value={signupData.city}
                    onChange={handleSignupChange('city')}
                    autoComplete="address-level2"
                  />
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 3
                  }}>
                  <TextField
                    label="State"
                    fullWidth
                    value={signupData.state}
                    onChange={handleSignupChange('state')}
                    inputProps={{ maxLength: 2 }}
                    autoComplete="address-level1"
                  />
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 3
                  }}>
                  <TextField
                    label="ZIP Code"
                    fullWidth
                    value={signupData.zipCode}
                    onChange={handleSignupChange('zipCode')}
                    inputProps={{ maxLength: 10 }}
                    autoComplete="postal-code"
                  />
                </Grid>

                <Grid size={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontSize: '1rem', fontWeight: 600, mt: 2 }}
                  >
                    Emergency Contact (Optional)
                  </Typography>
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    label="Emergency Contact Name"
                    fullWidth
                    value={signupData.emergencyContact}
                    onChange={handleSignupChange('emergencyContact')}
                  />
                </Grid>

                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    label="Emergency Contact Phone"
                    type="tel"
                    fullWidth
                    value={signupData.emergencyPhone}
                    onChange={handleSignupChange('emergencyPhone')}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <SignupIcon />
                }
                sx={{ mt: 4 }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', mt: 3 }}
      >
        By continuing, you agree to our{' '}
        <Link href="/terms" target="_blank">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" target="_blank">
          Privacy Policy
        </Link>
      </Typography>
    </Box>
  );
};

export default CustomerAuth;
