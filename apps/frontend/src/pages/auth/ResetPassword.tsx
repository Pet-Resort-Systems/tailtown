import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Formik, Form, Field, FormikHelpers, FormikErrors, FormikTouched } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link as MuiLink,
  CircularProgress,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../../services/api';

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

const ResetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if token exists
  if (!token) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Paper elevation={3} sx={{ width: '100%', maxWidth: 450, p: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Invalid or missing reset token. Please request a new password reset link.
          </Alert>
          <Button
            component={Link}
            to="/forgot-password"
            variant="contained"
            fullWidth
          >
            Request New Reset Link
          </Button>
        </Paper>
      </Box>
    );
  }

  const handleSubmit = async (
    values: ResetPasswordFormValues,
    { setSubmitting }: FormikHelpers<ResetPasswordFormValues>
  ) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      // Call the reset password API
      await api.post('/staff/reset-password', {
        token,
        password: values.password,
      });

      setSuccessMessage('Your password has been reset successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password. The link may have expired.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 450,
          p: 4,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {successMessage ? (
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
          ) : (
            <LockResetIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          )}
          <Typography variant="h5" component="h1" gutterBottom>
            {successMessage ? 'Password Reset!' : 'Reset Your Password'}
          </Typography>
          {!successMessage && (
            <Typography variant="body2" color="text.secondary">
              Please enter your new password below.
            </Typography>
          )}
        </Box>

        {/* Success Message */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Redirecting to login page...
            </Typography>
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Form */}
        {!successMessage && (
          <Formik
            initialValues={{ password: '', confirmPassword: '' }}
            validationSchema={ResetPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({
              errors,
              touched,
              isSubmitting,
            }: {
              errors: FormikErrors<ResetPasswordFormValues>;
              touched: FormikTouched<ResetPasswordFormValues>;
              isSubmitting: boolean;
            }) => (
              <Form>
                <Field
                  as={TextField}
                  name="password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  disabled={isSubmitting}
                  autoFocus
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Field
                  as={TextField}
                  name="confirmPassword"
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                  disabled={isSubmitting}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleToggleConfirmPasswordVisibility}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password Requirements */}
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Password must contain:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • At least 8 characters
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • One uppercase letter
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • One lowercase letter
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • One number
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    • One special character
                  </Typography>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  sx={{ mt: 3, mb: 2, py: 1.2 }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        )}

        {/* Link expired? */}
        {errorMessage && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Link expired or invalid?
            </Typography>
            <MuiLink component={Link} to="/forgot-password" variant="body2">
              Request a new reset link
            </MuiLink>
          </Box>
        )}

        {/* Back to Login */}
        {!successMessage && !errorMessage && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <MuiLink component={Link} to="/login" variant="body2">
              Back to Sign In
            </MuiLink>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ResetPassword;
