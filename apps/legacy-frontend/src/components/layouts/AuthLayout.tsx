import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';

const AuthLayout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'primary.main',
        backgroundImage: 'linear-gradient(315deg, #4c8bf5 0%, #80b4ff 74%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            py: 4,
            px: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}
          >
            Tailtown Pet Resort
          </Typography>
          {children || <Outlet />}
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthLayout;
