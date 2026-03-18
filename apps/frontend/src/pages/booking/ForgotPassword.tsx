/**
 * ForgotPassword - Request password reset for customer portal
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { requestPasswordReset } = useCustomerAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h5" component="h1" gutterBottom align="center">
              Check Your Email
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              If an account exists with <strong>{email}</strong>, you will
              receive a password reset link shortly.
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The link will expire in 24 hours. If you don't see the email,
              check your spam folder.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/book')}>
                Back to Login
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
              >
                Try Different Email
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Reset Your Password
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
            align="center"
          >
            Enter your email address and we'll send you a link to reset your
            password.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3 }}
              autoComplete="email"
              autoFocus
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => navigate('/book')}
              >
                Back to Login
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
