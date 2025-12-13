/**
 * Audit Logs Page
 *
 * Admin view for browsing and searching audit logs.
 * Shows who did what, when, and from where.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Collapse,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { format, subDays } from "date-fns";
import auditLogService, {
  AuditLog,
  AuditLogQueryParams,
} from "../../services/auditLogService";

// Action categories for filtering
const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "PET", label: "Pet" },
  { value: "RESERVATION", label: "Reservation" },
  { value: "PAYMENT", label: "Payment" },
  { value: "STAFF", label: "Staff" },
  { value: "AUTH", label: "Authentication" },
  { value: "SETTINGS", label: "Settings" },
];

// Actions for filtering
const ACTIONS = [
  { value: "", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "LOGIN_FAILED", label: "Failed Login" },
];

// Severity levels
const SEVERITIES = [
  { value: "", label: "All Severities" },
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
];

// Severity chip colors
const getSeverityColor = (
  severity: string
): "default" | "info" | "warning" | "error" => {
  switch (severity) {
    case "CRITICAL":
      return "error";
    case "WARNING":
      return "warning";
    default:
      return "info";
  }
};

// Action chip colors
const getActionColor = (
  action: string
): "default" | "primary" | "secondary" | "success" | "error" | "warning" => {
  switch (action) {
    case "CREATE":
      return "success";
    case "UPDATE":
      return "primary";
    case "DELETE":
      return "error";
    case "LOGIN":
      return "success";
    case "LOGOUT":
      return "default";
    case "LOGIN_FAILED":
      return "warning";
    default:
      return "default";
  }
};

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(
    subDays(new Date(), 7)
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Expanded rows for showing changes
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params: AuditLogQueryParams = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      };

      if (category) params.category = category;
      if (action) params.action = action;
      if (severity) params.severity = severity;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await auditLogService.getAuditLogs(params);

      if (response.success) {
        setLogs(response.data);
        setTotal(response.pagination.total);
      } else {
        setError("Failed to load audit logs");
      }
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      setError(err.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    category,
    action,
    severity,
    search,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleRowExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SecurityIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Audit Logs
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchLogs} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  label="Category"
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(0);
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={action}
                  label="Action"
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(0);
                  }}
                >
                  {ACTIONS.map((act) => (
                    <MenuItem key={act.value} value={act.value}>
                      {act.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={severity}
                  label="Severity"
                  onChange={(e) => {
                    setSeverity(e.target.value);
                    setPage(0);
                  }}
                >
                  {SEVERITIES.map((sev) => (
                    <MenuItem key={sev.value} value={sev.value}>
                      {sev.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  setPage(0);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setPage(0);
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  endAdornment: <SearchIcon color="action" />,
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Logs Table */}
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40}></TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No audit logs found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow
                        hover
                        onClick={() => handleViewDetails(log)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          {(log.changedFields?.length ||
                            log.previousValue ||
                            log.newValue) && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpanded(log.id);
                              }}
                            >
                              {expandedRows.has(log.id) ? (
                                <ExpandLessIcon />
                              ) : (
                                <ExpandMoreIcon />
                              )}
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(log.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {log.userName || log.userEmail || "System"}
                          </Typography>
                          {log.userRole && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {log.userRole}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.action}
                            size="small"
                            color={getActionColor(log.action)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.category}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {log.entityName || log.entityType}
                          </Typography>
                          {log.entityId && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block" }}
                            >
                              ID: {log.entityId.substring(0, 8)}...
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.severity}
                            size="small"
                            color={getSeverityColor(log.severity)}
                            icon={
                              log.severity === "CRITICAL" ? (
                                <WarningIcon />
                              ) : (
                                <InfoIcon />
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {log.ipAddress || "-"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {/* Expanded row for changes */}
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 0 }}>
                          <Collapse
                            in={expandedRows.has(log.id)}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ p: 2, bgcolor: "grey.50" }}>
                              {log.changedFields &&
                                log.changedFields.length > 0 && (
                                  <Box sx={{ mb: 1 }}>
                                    <Typography
                                      variant="subtitle2"
                                      gutterBottom
                                    >
                                      Changed Fields:
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 0.5,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {log.changedFields.map((field) => (
                                        <Chip
                                          key={field}
                                          label={field}
                                          size="small"
                                          variant="outlined"
                                        />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                              {log.metadata && (
                                <Box>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Additional Info:
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{
                                      fontSize: "0.75rem",
                                      overflow: "auto",
                                    }}
                                  >
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {/* Detail Dialog */}
        <Dialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogContent dividers>
            {selectedLog && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Action
                      </Typography>
                      <Chip
                        label={selectedLog.action}
                        color={getActionColor(selectedLog.action)}
                        sx={{ mt: 0.5 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Severity
                      </Typography>
                      <Chip
                        label={selectedLog.severity}
                        color={getSeverityColor(selectedLog.severity)}
                        sx={{ mt: 0.5 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        User
                      </Typography>
                      <Typography variant="body1">
                        {selectedLog.userName ||
                          selectedLog.userEmail ||
                          "System"}
                      </Typography>
                      {selectedLog.userRole && (
                        <Typography variant="caption" color="text.secondary">
                          {selectedLog.userRole}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Time
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(selectedLog.createdAt)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Entity
                      </Typography>
                      <Typography variant="body1">
                        {selectedLog.entityName || selectedLog.entityType}
                      </Typography>
                      {selectedLog.entityId && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          ID: {selectedLog.entityId}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        IP Address
                      </Typography>
                      <Typography variant="body1">
                        {selectedLog.ipAddress || "-"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {selectedLog.requestPath && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Request
                        </Typography>
                        <Typography variant="body1">
                          {selectedLog.requestMethod} {selectedLog.requestPath}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {selectedLog.changedFields &&
                  selectedLog.changedFields.length > 0 && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Changed Fields
                          </Typography>
                          <Box
                            sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}
                          >
                            {selectedLog.changedFields.map((field) => (
                              <Chip key={field} label={field} size="small" />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                {selectedLog.previousValue && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Previous Value
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            fontSize: "0.75rem",
                            overflow: "auto",
                            maxHeight: 200,
                          }}
                        >
                          {JSON.stringify(selectedLog.previousValue, null, 2)}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {selectedLog.newValue && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          gutterBottom
                        >
                          New Value
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            fontSize: "0.75rem",
                            overflow: "auto",
                            maxHeight: 200,
                          }}
                        >
                          {JSON.stringify(selectedLog.newValue, null, 2)}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AuditLogs;
