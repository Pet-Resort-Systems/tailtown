import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import api from '../../services/api';

interface ForgotPasswordFormValues {
  email: string;
}

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (
    values: ForgotPasswordFormValues,
    { setSubmitting }: FormikHelpers<ForgotPasswordFormValues>
  ) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      // Call the password reset API
      await api.post('/staff/request-reset', {
        email: values.email,
      });

      setSuccessMessage(
        'If your email is registered, you will receive a password reset link shortly. Please check your email.'
      );
    } catch (error: any) {
      // For security reasons, show generic message even on error
      setSuccessMessage(
        'If your email is registered, you will receive a password reset link shortly. Please check your email.'
      );
    } finally {
      setSubmitting(false);
    }
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
        {/* Back to Login Link */}
        <Box sx={{ mb: 3 }}>
          <MuiLink
            component={Link}
            to="/login"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              textDecoration: 'none',
              color: 'primary.main',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            <ArrowBackIcon fontSize="small" />
            Back to Sign In
          </MuiLink>
        </Box>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Forgot Password?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
        </Box>

        {/* Success Message */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
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
            initialValues={{ email: '' }}
            validationSchema={ForgotPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({
              errors,
              touched,
              isSubmitting,
            }: {
              errors: FormikErrors<ForgotPasswordFormValues>;
              touched: FormikTouched<ForgotPasswordFormValues>;
              isSubmitting: boolean;
            }) => (
              <Form>
                <Field
                  as={TextField}
                  name="email"
                  label="Email Address"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  placeholder="Enter your email"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  disabled={isSubmitting}
                  autoFocus
                />

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
                    'Send Reset Link'
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        )}

        {/* After Success - Show Return to Login */}
        {successMessage && (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              fullWidth
            >
              Return to Sign In
            </Button>
          </Box>
        )}

        {/* Security Note */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            For security reasons, we'll send the reset link even if the email isn't registered.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForgotPassword;
