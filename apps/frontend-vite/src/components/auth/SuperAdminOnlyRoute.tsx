/**
 * Super Admin Only Route
 *
 * Wrapper component that requires super admin authentication.
 * Redirects to super admin login if not authenticated.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
// CircularProgress and Box available if needed for loading states

interface SuperAdminOnlyRouteProps {
  children: React.ReactNode;
}

const SuperAdminOnlyRoute: React.FC<SuperAdminOnlyRouteProps> = ({
  children,
}) => {
  const superAdminToken = localStorage.getItem('superAdminAccessToken');
  const impersonationSession = localStorage.getItem('impersonationSession');
  const accessToken = localStorage.getItem('accessToken');

  // Allow access if:
  // 1. Has super admin token, OR
  // 2. Has impersonation session (super admin impersonating a tenant)
  const hasAccess = superAdminToken || (impersonationSession && accessToken);

  // If no access, redirect to super admin login
  if (!hasAccess) {
    console.warn('No super admin access. Redirecting to super admin login.');
    return <Navigate to="/super-admin/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default SuperAdminOnlyRoute;
