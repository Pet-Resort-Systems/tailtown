/**
 * Super Admin Context
 *
 * Manages super admin authentication state and provides login/logout functionality.
 * Separate from regular staff authentication.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import axios from 'axios';

interface SuperAdmin {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface SuperAdminContextType {
  superAdmin: SuperAdmin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(
  undefined
);

const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  return envUrl && envUrl.length > 0 ? envUrl : window.location.origin;
};

const SUPER_ADMIN_API = `${getApiUrl()}/api/super-admin`;

export const SuperAdminProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  // Load super admin from localStorage on mount
  useEffect(() => {
    const loadSuperAdmin = async () => {
      const accessToken = localStorage.getItem('superAdminAccessToken');

      if (accessToken) {
        try {
          const response = await axios.get(`${SUPER_ADMIN_API}/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.data.success) {
            setSuperAdmin(response.data.data);
          }
        } catch (error) {
          console.error('Failed to load super admin:', error);
          // Clear invalid tokens
          localStorage.removeItem('superAdminAccessToken');
          localStorage.removeItem('superAdminRefreshToken');
        }
      }

      setLoading(false);
    };

    loadSuperAdmin();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${SUPER_ADMIN_API}/login`, {
        email,
        password,
      });

      if (response.data.success) {
        const { user, accessToken, refreshToken } = response.data.data;

        // Store tokens
        localStorage.setItem('superAdminAccessToken', accessToken);
        localStorage.setItem('superAdminRefreshToken', refreshToken);

        // CRITICAL: Also set as regular tokens so AuthContext and SuperAdminOnlyRoute work
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('tokenTimestamp', Date.now().toString());

        // CRITICAL: Clear any tenant IDs - super admin should not have tenant context
        localStorage.removeItem('tailtown_tenant_id');
        localStorage.removeItem('tenantId');

        // Set user
        setSuperAdmin(user);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      const accessToken = localStorage.getItem('superAdminAccessToken');

      if (accessToken) {
        await axios.post(
          `${SUPER_ADMIN_API}/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user regardless of API call success
      localStorage.removeItem('superAdminAccessToken');
      localStorage.removeItem('superAdminRefreshToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('tokenTimestamp');
      localStorage.removeItem('tailtown_tenant_id');
      localStorage.removeItem('tenantId');
      setSuperAdmin(null);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('superAdminRefreshToken');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${SUPER_ADMIN_API}/refresh`, {
        refreshToken,
      });

      if (response.data.success) {
        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        localStorage.setItem('superAdminAccessToken', accessToken);
        localStorage.setItem('superAdminRefreshToken', newRefreshToken);

        // Also update regular tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout
      await logout();
      throw error;
    }
  };

  return (
    <SuperAdminContext.Provider
      value={{ superAdmin, loading, login, logout, refreshToken }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
