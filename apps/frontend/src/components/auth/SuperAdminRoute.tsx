/**
 * Super Admin Protected Route
 * 
 * Wrapper component that requires super admin authentication.
 * Redirects to login if not authenticated.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { superAdmin, loading } = useSuperAdmin();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!superAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default SuperAdminRoute;
