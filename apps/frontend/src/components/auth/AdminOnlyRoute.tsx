/**
 * AdminOnlyRoute - Protects routes that require admin/manager access
 * Redirects non-admin users to dashboard with an error message
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { canAccessSettings } from "../../utils/permissions";

interface AdminOnlyRouteProps {
  children: React.ReactNode;
}

const AdminOnlyRoute: React.FC<AdminOnlyRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if user doesn't have admin access
  if (!canAccessSettings(user?.role)) {
    return (
      <Navigate
        to="/dashboard"
        state={{
          error:
            "You don't have permission to access this page. Admin or Manager role required.",
        }}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default AdminOnlyRoute;
