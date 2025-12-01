/**
 * Impersonation Banner
 *
 * Shows at the top of the screen when a super admin is impersonating a tenant.
 * Displays tenant name, time remaining, and exit button.
 */

import React, { useState, useEffect } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import {
  ExitToApp as ExitIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import axios from "axios";

interface ImpersonationBannerProps {
  onExit: () => void;
}

const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({
  onExit,
}) => {
  const [session, setSession] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Load session from localStorage
    const sessionData = localStorage.getItem("impersonationSession");
    if (sessionData) {
      const parsedSession = JSON.parse(sessionData);
      setSession(parsedSession);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (!session) return;

    // Calculate time remaining
    const calculateTimeRemaining = () => {
      const expiresAt = new Date(session.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000)); // seconds

      setTimeRemaining(remaining);

      // Show warning when less than 5 minutes remaining
      if (remaining <= 300 && remaining > 0) {
        setShowWarning(true);
      }

      // Auto-logout when expired
      if (remaining === 0) {
        handleExit();
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleExit = async () => {
    try {
      const token = localStorage.getItem("superAdminAccessToken");

      const getApiUrl = () => {
        if (process.env.NODE_ENV === "production") {
          return window.location.origin;
        }
        return process.env.REACT_APP_API_URL || "http://localhost:4004";
      };

      if (session && token) {
        // End the impersonation session on backend
        await axios.post(
          `${getApiUrl()}/api/super-admin/impersonate/end/${session.id}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error("Error ending impersonation:", error);
    } finally {
      // Clear ONLY impersonation data (keep super admin tokens!)
      localStorage.removeItem("impersonationToken");
      localStorage.removeItem("impersonationSession");

      // Restore super admin access token as the active token for both auth systems
      const superAdminToken = localStorage.getItem("superAdminAccessToken");
      if (superAdminToken) {
        localStorage.setItem("accessToken", superAdminToken);
        localStorage.setItem("token", superAdminToken); // For AuthContext
        localStorage.setItem("tokenTimestamp", Date.now().toString()); // For AuthContext
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("tokenTimestamp");
      }

      // Clear tenant ID to return to super admin context
      localStorage.removeItem("tailtown_tenant_id");
      localStorage.removeItem("tenantId");

      // Clear user data so it refreshes
      localStorage.removeItem("user");

      // Redirect back to tenant list
      window.location.href = "/admin/tenants";
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (!session) return null;

  return (
    <Alert
      severity={showWarning ? "warning" : "info"}
      icon={showWarning ? <WarningIcon /> : undefined}
      sx={{
        borderRadius: 0,
        position: "sticky",
        top: 0,
        zIndex: 1200,
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
      action={
        <Button
          color="inherit"
          size="small"
          startIcon={<ExitIcon />}
          onClick={handleExit}
        >
          Exit Impersonation
        </Button>
      }
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          🔐 Impersonating: {session.businessName} ({session.subdomain})
        </Typography>
        <Typography variant="body2" sx={{ ml: 2 }}>
          {showWarning ? "⚠️ " : ""}Time Remaining: {formatTime(timeRemaining)}
        </Typography>
      </Box>
    </Alert>
  );
};

export default ImpersonationBanner;
