import React, { createContext, useState, useContext, useEffect } from "react";

// Define types
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  profilePhoto?: string | null;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  error: string | null;
};

// Create context with default values
export const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if the user is already logged in on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const tokenTimestamp = localStorage.getItem("tokenTimestamp");
        const userJson = localStorage.getItem("user");

        if (token && tokenTimestamp && userJson) {
          // Check if token is expired (24 hour expiration)
          const tokenAge = Date.now() - parseInt(tokenTimestamp);
          const tokenExpiration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

          if (tokenAge < tokenExpiration) {
            setUser(JSON.parse(userJson));
          } else {
            // Token expired, clear everything
            localStorage.removeItem("token");
            localStorage.removeItem("tokenTimestamp");
            localStorage.removeItem("user");
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // On error, clear everything to be safe
        localStorage.removeItem("token");
        localStorage.removeItem("tokenTimestamp");
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    // Set up an interval to check token expiration every minute
    const interval = setInterval(checkAuthStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Authenticate user and create session
   * Uses dynamic API URL based on environment (window.location.origin in production)
   * Stores user data including profilePhoto in localStorage for session persistence
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if credentials are invalid or API call fails
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Real API call to login endpoint - uses dynamic URL for multi-tenant support
      const apiUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : process.env.REACT_APP_API_URL || "http://localhost:4004";

      // Extract tenant subdomain from hostname
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      const subdomain =
        parts.length >= 3
          ? parts[0]
          : localStorage.getItem("tailtown_tenant_id") || "dev";

      const response = await fetch(`${apiUrl}/api/staff/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Subdomain": subdomain,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      // The backend returns { status: 'success', data: { staff data }, accessToken: 'jwt...' }
      // Extract the staff data and JWT token from the response
      const userData: User = {
        id: data.data.id,
        email: data.data.email,
        firstName: data.data.firstName,
        lastName: data.data.lastName,
        role: data.data.role,
        profilePhoto: data.data.profilePhoto,
      };

      // Store JWT token from backend (backend returns 'token', not 'accessToken')
      const token = data.token || data.accessToken;

      // Store in localStorage with timestamp (store as both 'token' and 'accessToken' for compatibility)
      localStorage.setItem("token", token);
      localStorage.setItem("accessToken", token);
      localStorage.setItem("tokenTimestamp", Date.now().toString());
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("tokenTimestamp");
    localStorage.removeItem("user");
    setUser(null);
  };

  // Update user function
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
