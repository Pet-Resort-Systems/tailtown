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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a password');
      return;
    }

    const success = login(password);
    if (success) {
      navigate('/');
    } else {
      setError('Invalid password. Please try again.');
      setPassword('');
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
                type={showPassword ? 'text' : 'password'}
                label="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
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
                sx={{ mb: 2 }}
              >
                Sign In
              </Button>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>Development Mode</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Default password: admin123
                </Typography>
              </Box>
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
