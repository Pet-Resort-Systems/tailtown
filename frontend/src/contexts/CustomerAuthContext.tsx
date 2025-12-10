/**
 * CustomerAuthContext - Authentication for customer-facing booking portal
 * Separate from staff AuthContext to keep customer and staff auth isolated
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { customerService } from "../services/customerService";
import api from "../services/api";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (customerData: any) => Promise<void>;
  logout: () => void;
  updateCustomer: (data: Partial<Customer>) => void;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  checkPasswordStatus: (
    email: string
  ) => Promise<{ hasPassword: boolean; portalEnabled: boolean }>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(
  undefined
);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedCustomer = localStorage.getItem("customer");
        if (savedCustomer) {
          setCustomer(JSON.parse(savedCustomer));
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Use the new authentication endpoint that verifies password
      const response = await api.post("/api/customers/auth/login", {
        email,
        password,
      });

      if (response.data.status === "success") {
        const customerData = response.data.data;
        setCustomer(customerData);
        localStorage.setItem("customer", JSON.stringify(customerData));
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error("Customer not found");
      } else if (error.response?.status === 403) {
        throw new Error("Portal access disabled for this account");
      } else if (error.response?.status === 401) {
        // Check if password not set
        if (error.response?.data?.message === "PASSWORD_NOT_SET") {
          throw new Error("PASSWORD_NOT_SET");
        }
        throw new Error("Invalid password");
      } else if (error.response?.status === 429) {
        throw new Error("Too many login attempts. Please try again later.");
      }
      throw error;
    }
  };

  const signup = async (customerData: any) => {
    try {
      // Create new customer account
      const newCustomer = await customerService.createCustomer({
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        zipCode: customerData.zipCode,
        emergencyContact: customerData.emergencyContact,
        emergencyPhone: customerData.emergencyPhone,
        isActive: true,
      });

      setCustomer(newCustomer);
      localStorage.setItem("customer", JSON.stringify(newCustomer));
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem("customer");
  };

  const updateCustomer = (data: Partial<Customer>) => {
    if (customer) {
      const updated = { ...customer, ...data };
      setCustomer(updated);
      localStorage.setItem("customer", JSON.stringify(updated));
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await api.post("/api/customers/auth/forgot-password", { email });
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error("Too many requests. Please try again later.");
      }
      // Don't reveal if email exists or not
      console.error("Password reset request error:", error);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      const response = await api.post("/api/customers/auth/reset-password", {
        token,
        password,
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to reset password");
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  };

  const checkPasswordStatus = async (
    email: string
  ): Promise<{ hasPassword: boolean; portalEnabled: boolean }> => {
    try {
      const response = await api.get(
        `/api/customers/auth/check-password?email=${encodeURIComponent(email)}`
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error("Customer not found");
      }
      throw error;
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        login,
        signup,
        logout,
        updateCustomer,
        requestPasswordReset,
        resetPassword,
        checkPasswordStatus,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return context;
};
