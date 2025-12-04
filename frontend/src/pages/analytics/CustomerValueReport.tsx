import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  useTheme,
  Button,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import analyticsService, {
  CustomerValueData,
} from "../../services/analyticsService";
import { formatCurrency } from "../../utils/formatters";
import { useNavigate } from "react-router-dom";

interface ExpandableRowProps {
  customer: CustomerValueData;
  theme: any;
}

const ExpandableRow = ({ customer, theme }: ExpandableRowProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
  ];

  const viewCustomerDetails = () => {
    navigate(`/customers/${customer.id}`);
  };

  return (
    <>
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {customer.name}
        </TableCell>
        <TableCell>{customer.email}</TableCell>
        <TableCell align="right">{customer.invoiceCount}</TableCell>
        <TableCell align="right">
          {formatCurrency(customer.totalSpend)}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="bold" color="primary">
            {formatCurrency(customer.totalSpend)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Lifetime Value
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Button variant="outlined" size="small" onClick={viewCustomerDetails}>
            View Details
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom component="div">
                    Service Breakdown
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Service</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customer.serviceBreakdown.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell component="th" scope="row">
                              {service.name}
                            </TableCell>
                            <TableCell align="right">{service.count}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(service.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow
                          sx={{ backgroundColor: "rgba(0, 0, 0, 0.04)" }}
                        >
                          <TableCell component="th" scope="row">
                            <strong>Total</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              {customer.serviceBreakdown.reduce(
                                (sum, service) => sum + service.count,
                                0
                              )}
                            </strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              {formatCurrency(
                                customer.serviceBreakdown.reduce(
                                  (sum, service) => sum + service.revenue,
                                  0
                                )
                              )}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom component="div">
                    Add-On Breakdown
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Add-On</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customer.addOnBreakdown.map((addon) => (
                          <TableRow key={addon.id}>
                            <TableCell component="th" scope="row">
                              {addon.name}
                            </TableCell>
                            <TableCell align="right">{addon.count}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(addon.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow
                          sx={{ backgroundColor: "rgba(0, 0, 0, 0.04)" }}
                        >
                          <TableCell component="th" scope="row">
                            <strong>Total</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              {customer.addOnBreakdown.reduce(
                                (sum, addon) => sum + addon.count,
                                0
                              )}
                            </strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              {formatCurrency(customer.addOnTotal)}
                            </strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ height: 250 }}>
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minHeight={200}
                    >
                      <PieChart>
                        <Pie
                          data={[
                            ...customer.serviceBreakdown.map((service) => ({
                              name: service.name,
                              value: service.revenue,
                              type: "service",
                            })),
                            ...customer.addOnBreakdown.map((addon) => ({
                              name: addon.name,
                              value: addon.revenue,
                              type: "addon",
                            })),
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({
                            name,
                            percent,
                          }: {
                            name?: string;
                            percent?: number;
                          }) =>
                            percent && percent > 0.05
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ""
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            ...customer.serviceBreakdown.map((entry, index) => (
                              <Cell
                                key={`cell-service-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )),
                            ...customer.addOnBreakdown.map((entry, index) => (
                              <Cell
                                key={`cell-addon-${index}`}
                                fill={
                                  COLORS[
                                    (index + customer.serviceBreakdown.length) %
                                      COLORS.length
                                  ]
                                }
                              />
                            )),
                          ]}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const CustomerValueReport = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customers, setCustomers] = useState<CustomerValueData[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<
    CustomerValueData[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const customerData = await analyticsService.getCustomerValue(period);
      setCustomers(customerData);
      setFilteredCustomers(customerData);
    } catch (err) {
      console.error("Error loading customer value data:", err);
      setError("Failed to load customer data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  const filterCustomers = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term)
    );

    setFilteredCustomers(filtered);
    setPage(0); // Reset to first page when filtering
  }, [searchTerm, customers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    filterCustomers();
  }, [filterCustomers]);

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setPeriod(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "day":
        return "Today";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "year":
        return "This Year";
      case "all":
        return "All Time";
      default:
        return "Custom Period";
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, color: "error.main" }}>
        <Typography variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Customer Value Report
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1" color="text.secondary">
            Track customer spending and identify your most valuable customers
          </Typography>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="period-select-label">Time Period</InputLabel>
            <Select
              labelId="period-select-label"
              id="period-select"
              value={period}
              label="Time Period"
              onChange={handlePeriodChange}
            >
              <MenuItem value="day">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ borderRadius: 2, mb: 4 }}>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Customer Value
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ mt: 1, color: "primary.main" }}
                  >
                    {formatCurrency(
                      customers.reduce(
                        (sum, customer) => sum + customer.totalSpend,
                        0
                      )
                    )}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {getPeriodLabel()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Customers
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ mt: 1, color: "secondary.main" }}
                  >
                    {customers.length}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {getPeriodLabel()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Avg. Customer Value
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ mt: 1, color: "success.main" }}
                  >
                    {formatCurrency(
                      customers.length > 0
                        ? customers.reduce(
                            (sum, customer) => sum + customer.totalSpend,
                            0
                          ) / customers.length
                        : 0
                    )}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {getPeriodLabel()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Avg. LTV
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ mt: 1, color: "warning.main" }}
                  >
                    {formatCurrency(
                      customers.length > 0
                        ? customers.reduce(
                            (sum, customer) => sum + customer.totalSpend,
                            0
                          ) / customers.length
                        : 0
                    )}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    All Time Average
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Customer Spending</Typography>
            <TextField
              label="Search Customers"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer>
            <Table aria-label="customer value table">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Invoices</TableCell>
                  <TableCell align="right">Period Spend</TableCell>
                  <TableCell align="right">LTV</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((customer) => (
                    <ExpandableRow
                      key={customer.id}
                      customer={customer}
                      theme={theme}
                    />
                  ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredCustomers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default CustomerValueReport;
