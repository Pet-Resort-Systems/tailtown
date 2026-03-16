import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

interface SuperAdmin {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  admin: SuperAdmin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AdminPortalAuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_CUSTOMER_SERVICE_URL;
  return envUrl && envUrl.length > 0 ? envUrl : window.location.origin;
};

const SUPER_ADMIN_API = `${getApiUrl()}/api/super-admin`;

export const AdminPortalAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<SuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdmin = async () => {
      const accessToken = localStorage.getItem("superAdminAccessToken");

      if (accessToken) {
        try {
          const response = await axios.get(`${SUPER_ADMIN_API}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (response.data.success) {
            setAdmin(response.data.data);
          }
        } catch (error) {
          localStorage.removeItem("superAdminAccessToken");
          localStorage.removeItem("superAdminRefreshToken");
        }
      }

      setLoading(false);
    };

    loadAdmin();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${SUPER_ADMIN_API}/login`, {
        email,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Login failed");
      }

      const { user, accessToken, refreshToken } = response.data.data;

      localStorage.setItem("superAdminAccessToken", accessToken);
      localStorage.setItem("superAdminRefreshToken", refreshToken);
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("token", accessToken);
      localStorage.setItem("tokenTimestamp", Date.now().toString());
      localStorage.removeItem("tailtown_tenant_id");
      localStorage.removeItem("tenantId");

      setAdmin(user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  const logout = async () => {
    const accessToken = localStorage.getItem("superAdminAccessToken");

    try {
      if (accessToken) {
        await axios.post(
          `${SUPER_ADMIN_API}/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      }
    } finally {
      localStorage.removeItem("superAdminAccessToken");
      localStorage.removeItem("superAdminRefreshToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("tokenTimestamp");
      localStorage.removeItem("tailtown_tenant_id");
      localStorage.removeItem("tenantId");
      setAdmin(null);
    }
  };

  return (
    <AdminPortalAuthContext.Provider
      value={{
        isAuthenticated: !!admin,
        admin,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AdminPortalAuthContext.Provider>
  );
};

export const useAdminPortalAuth = () => {
  const context = useContext(AdminPortalAuthContext);
  if (context === undefined) {
    throw new Error("useAdminPortalAuth must be used within an AdminPortalAuthProvider");
  }
  return context;
};
