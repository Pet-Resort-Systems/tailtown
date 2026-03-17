import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Formik,
  Form,
  Field,
  FormikHelpers,
  FormikErrors,
  FormikTouched,
} from 'formik';
import * as Yup from 'yup';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link as MuiLink,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormValues {
  email: string;
  password: string;
}

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string().required('Password is required'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  // Handle tenant parameter from wizard redirect
  useEffect(() => {
    const tenant = searchParams.get('tenant');
    if (tenant) {
      localStorage.setItem('tailtown_tenant_id', tenant);
      setTenantName(tenant);
      console.log('Set tenant ID from URL:', tenant);
    }
  }, [searchParams]);

  const handleSubmit = async (
    values: LoginFormValues,
    { setSubmitting }: FormikHelpers<LoginFormValues>
  ) => {
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage('Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
      <Typography
        variant="h5"
        component="h2"
        sx={{ mb: 3, textAlign: 'center' }}
      >
        Sign In
      </Typography>

      {tenantName && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Welcome to <strong>{tenantName.replace(/-/g, ' ')}</strong>! Please
          sign in with your staff credentials.
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Formik
        initialValues={{
          email: '',
          password: '',
        }}
        validationSchema={LoginSchema}
        onSubmit={handleSubmit}
      >
        {({
          errors,
          touched,
          isSubmitting,
        }: {
          errors: FormikErrors<LoginFormValues>;
          touched: FormikTouched<LoginFormValues>;
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
              error={touched.email && Boolean(errors.email)}
              helperText={touched.email && errors.email}
              disabled={isSubmitting}
              InputLabelProps={{ shrink: true }}
            />

            <Field
              as={TextField}
              name="password"
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              variant="outlined"
              error={touched.password && Boolean(errors.password)}
              helperText={touched.password && errors.password}
              disabled={isSubmitting}
              InputLabelProps={{ shrink: true }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              sx={{ mt: 3, mb: 2, py: 1.2 }}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <MuiLink component={Link} to="/forgot-password" variant="body2">
                Forgot password?
              </MuiLink>
            </Box>
          </Form>
        )}
      </Formik>
    </Box>
  );
};

export default Login;
