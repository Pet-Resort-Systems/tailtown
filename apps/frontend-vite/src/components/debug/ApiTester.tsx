import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import { reservationApi } from "../../services/api";
import { formatDateToYYYYMMDD } from "../../utils/dateUtils";

/**
 * Debug component to test API connectivity
 */
const ApiTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [apiUrl] = useState<string>(
    process.env.REACT_APP_RESERVATION_API_URL || window.location.origin
  );

  const testApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("Testing API connectivity...");
      console.log("API URL:", apiUrl);

      // Test the API connection
      const response = await reservationApi.get("/api/resources/availability", {
        params: {
          resourceType: "suite",
          date: formatDateToYYYYMMDD(new Date()),
        },
      });

      console.log("API response:", response);
      setResult({
        status: response.status,
        data: response.data,
        headers: response.headers,
        resourceCount: response.data?.data?.length || 0,
      });
    } catch (err: any) {
      console.error("API test failed:", err);
      setError(
        `API test failed: ${err.message}. ${
          err.response?.status ? `Status: ${err.response.status}` : ""
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Automatically run the test on component mount
  useEffect(() => {
    testApi();
  }, [testApi]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        API Connectivity Tester
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1">
          Testing connection to: <strong>{apiUrl}</strong>
        </Typography>
      </Box>

      <Button
        variant="contained"
        onClick={testApi}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : "Test API Connection"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Test Results:</Typography>
          <Typography>Status: {result.status}</Typography>
          <Typography>API Status: {result.data?.status}</Typography>
          <Typography>Resources: {result.data?.data?.length || 0}</Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Response Data:</Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: "#f5f5f5",
                borderRadius: 1,
                overflow: "auto",
                maxHeight: 400,
              }}
            >
              {JSON.stringify(result.data, null, 2)}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ApiTester;
