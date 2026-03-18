import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  AdminPanelSettings as AdminIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAdminPortalAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAdminPortalAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate('/admin-portal');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <AdminIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" component="h1" gutterBottom>
                Admin Portal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Platform Administration & Management
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter super admin email"
                autoFocus
                disabled={loading}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white', opacity: 0.8 }}>
            Tailtown Platform Administration
          </Typography>
          <Typography variant="caption" sx={{ color: 'white', opacity: 0.6 }}>
            Secure access for platform administrators only
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
