/**
 * Financial Reports Component
 * Displays financial analytics and reports
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  AttachMoney as MoneyIcon,
  GetApp as ExportIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import {
  formatCurrency,
  getFinancialRevenueReport,
  getFinancialProfitLossReport,
  getFinancialOutstandingReport,
  getFinancialRefundsReport,
  exportReportCSV,
} from "../../services/reportService";

type ReportType = "revenue" | "profit-loss" | "outstanding" | "refunds";

const FinancialReports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (reportType) {
        case "revenue":
          response = await getFinancialRevenueReport(startDate, endDate);
          break;
        case "profit-loss":
          response = await getFinancialProfitLossReport(startDate, endDate);
          break;
        case "outstanding":
          response = await getFinancialOutstandingReport();
          break;
        case "refunds":
          response = await getFinancialRefundsReport(startDate, endDate);
          break;
      }

      // Extract the actual data from the response
      const data = response?.data || response;
      setReportData(data);
    } catch (err: any) {
      console.error("Error loading report:", err);
      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reportData) {
      exportReportCSV(reportData);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h5">
          <MoneyIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Financial Reports
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            disabled={!reportData || loading}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            disabled={!reportData || loading}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <MenuItem value="revenue">Revenue</MenuItem>
                <MenuItem value="profit-loss">Profit & Loss</MenuItem>
                <MenuItem value="outstanding">Outstanding Balances</MenuItem>
                <MenuItem value="refunds">Refunds</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {reportType !== "outstanding" && (
            <>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={loadReport}
              disabled={loading}
            >
              Generate Report
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Report Data */}
      {!loading && reportData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.totalRevenue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Expenses
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.totalExpenses || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Net Profit
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(reportData.summary?.netProfit || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Data Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.data && reportData.data.length > 0 ? (
                    reportData.data.map((row: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{row.date || "-"}</TableCell>
                        <TableCell>{row.description || "-"}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="textSecondary">
                          No data available for the selected period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Instructions */}
      {!loading && !reportData && !error && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom>
            Financial Reports
          </Typography>
          <Typography color="textSecondary">
            Select a report type and date range, then click "Generate Report" to
            view financial data.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default FinancialReports;
