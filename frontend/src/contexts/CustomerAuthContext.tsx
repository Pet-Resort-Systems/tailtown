/**
 * CustomerAuthContext - Authentication for customer-facing booking portal
 * Separate from staff AuthContext to keep customer and staff auth isolated
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { customerService } from "../services/customerService";

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

  const login = async (email: string, _password: string) => {
    try {
      // Use public lookup endpoint (no auth required)
      // Note: Password is currently not verified - future enhancement
      // TODO(auth): Add password verification when customer passwords are implemented
      const customerData = await customerService.lookupByEmail(email);

      setCustomer(customerData);
      localStorage.setItem("customer", JSON.stringify(customerData));
    } catch (error: any) {
      // Re-throw with user-friendly message
      if (error.response?.status === 404) {
        throw new Error("Customer not found");
      } else if (error.response?.status === 403) {
        throw new Error("Portal access disabled for this account");
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
