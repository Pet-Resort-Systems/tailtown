import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Typography,
  Container,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";
import { Customer, customerService } from "../../services/customerService";
import EmojiIconDisplay from "../../components/customers/EmojiIconDisplay";
import CustomerIconSelectorNew from "../../components/customers/CustomerIconSelectorNew";
import {
  ALL_CUSTOMER_ICONS,
  getCustomerIconById,
} from "../../constants/customerIcons";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import DescriptionIcon from "@mui/icons-material/Description";
import Tooltip from "@mui/material/Tooltip";
import { Chip, Collapse } from "@mui/material";

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterIcons, setSelectedFilterIcons] = useState<string[]>([]);
  const [filterIconsOpen, setFilterIconsOpen] = useState(false);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string, iconFilters: string[]) => {
        console.log("Debounced search triggered:", { query, iconFilters });

        try {
          // Don't show loading spinner for searches - keeps UI stable
          let result;

          // Use server-side search if there's a text query
          if (query) {
            console.log("Using server-side search for:", query);
            result = await customerService.searchCustomers(query, 1, 100); // Search results
          } else {
            console.log("Loading initial customers (use search to find more)");
            result = await customerService.getAllCustomers(1, 100); // Fast initial load, use search for more
          }

          let filtered = result.data || [];
          console.log("Server returned:", filtered.length, "customers");

          // Apply icon filters client-side (customer must have ALL selected icons)
          if (iconFilters.length > 0) {
            filtered = filtered.filter((customer) => {
              const customerIcons = customer.customerIcons || [];
              return iconFilters.every((iconId) =>
                customerIcons.includes(iconId)
              );
            });
            console.log("After icon filter:", filtered.length, "customers");
          }

          setCustomers(filtered);
          setFilteredCustomers(filtered);
          setLoading(false); // Clear initial loading state
        } catch (err) {
          console.error("Error searching customers:", err);
          setError("Failed to search customers");
          setLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery, selectedFilterIcons);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, selectedFilterIcons, debouncedSearch]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [iconSelectorOpen, setIconSelectorOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [tempSelectedIcons, setTempSelectedIcons] = useState<string[]>([]);
  const [tempIconNotes, setTempIconNotes] = useState<Record<string, string>>(
    {}
  );

  // Initial load is handled by debouncedSearch effect - no separate loadCustomers needed

  const handleAddNew = useCallback(() => {
    navigate("/customers/new");
  }, [navigate]);

  const handleRowClick = useCallback(
    (customerId: string) => {
      navigate(`/customers/${customerId}`);
    },
    [navigate]
  );

  const handleIconClick = useCallback(
    (e: React.MouseEvent, customer: Customer) => {
      e.stopPropagation(); // Prevent row click
      setSelectedCustomer(customer);
      setTempSelectedIcons(customer.customerIcons || []);
      setTempIconNotes(customer.iconNotes || {});
      setIconSelectorOpen(true);
    },
    []
  );

  const handleIconSave = useCallback(
    async (icons: string[], notes: Record<string, string>) => {
      if (!selectedCustomer) return;

      try {
        await customerService.updateCustomer(selectedCustomer.id, {
          customerIcons: icons,
          iconNotes: notes,
        });

        // Update the customer in the list
        const updatedCustomers = customers.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, customerIcons: icons, iconNotes: notes }
            : c
        );
        setCustomers(updatedCustomers);
        setFilteredCustomers(updatedCustomers);

        setSnackbar({
          open: true,
          message: "Customer icons updated",
          severity: "success",
        });
      } catch (err) {
        console.error("Error updating customer icons:", err);
        setSnackbar({
          open: true,
          message: "Failed to update icons",
          severity: "error",
        });
      }
    },
    [selectedCustomer, customers]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Prevent row click
      if (
        window.confirm(
          "Are you sure you want to permanently delete this customer? This action cannot be undone."
        )
      ) {
        try {
          await customerService.deleteCustomer(id);

          // Refresh the customer list after deletion
          const updatedCustomers = await customerService.getAllCustomers();
          setCustomers(updatedCustomers.data || []);

          setSnackbar({
            open: true,
            message: "Customer permanently deleted",
            severity: "success",
          });
        } catch (err) {
          console.error("Error deleting customer:", err);
          setSnackbar({
            open: true,
            message: "Error deleting customer. Please try again.",
            severity: "error",
          });

          // Refresh list to ensure UI is in sync with backend
          const updatedCustomers = await customerService.getAllCustomers();
          setCustomers(updatedCustomers.data || []);
        }
      }
    },
    [setCustomers, setSnackbar]
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h4" gutterBottom>
              Customers
            </Typography>
            <Button variant="contained" color="primary" onClick={handleAddNew}>
              Add New Customer
            </Button>
          </Box>

          <TextField
            fullWidth
            placeholder="Search by customer name, email, phone, or pet name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* Icon Filter Section */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Button
                size="small"
                startIcon={<FilterListIcon />}
                onClick={() => setFilterIconsOpen(!filterIconsOpen)}
                variant={
                  selectedFilterIcons.length > 0 ? "contained" : "outlined"
                }
              >
                Filter by Icons{" "}
                {selectedFilterIcons.length > 0 &&
                  `(${selectedFilterIcons.length})`}
              </Button>
              {selectedFilterIcons.length > 0 && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={() => setSelectedFilterIcons([])}
                  color="secondary"
                >
                  Clear Filters
                </Button>
              )}
            </Box>

            <Collapse in={filterIconsOpen}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Select icons to filter customers (customers must have ALL
                  selected icons):
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {ALL_CUSTOMER_ICONS.map((icon) => {
                    const isSelected = selectedFilterIcons.includes(icon.id);
                    return (
                      <Chip
                        key={icon.id}
                        label={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <span style={{ fontSize: "1rem" }}>
                              {icon.icon}
                            </span>
                            <Typography variant="caption">
                              {icon.label}
                            </Typography>
                          </Box>
                        }
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFilterIcons(
                              selectedFilterIcons.filter((id) => id !== icon.id)
                            );
                          } else {
                            setSelectedFilterIcons([
                              ...selectedFilterIcons,
                              icon.id,
                            ]);
                          }
                        }}
                        color={isSelected ? "primary" : "default"}
                        variant={isSelected ? "filled" : "outlined"}
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            transform: "scale(1.05)",
                          },
                          transition: "transform 0.2s",
                        }}
                      />
                    );
                  })}
                </Box>
              </Paper>
            </Collapse>

            {/* Active Filter Chips */}
            {selectedFilterIcons.length > 0 && !filterIconsOpen && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mr: 1, alignSelf: "center" }}
                >
                  Active filters:
                </Typography>
                {selectedFilterIcons.map((iconId) => {
                  const iconDef = getCustomerIconById(iconId);
                  if (!iconDef) return null;
                  return (
                    <Chip
                      key={iconId}
                      label={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <span style={{ fontSize: "0.9rem" }}>
                            {iconDef.icon}
                          </span>
                          <Typography variant="caption">
                            {iconDef.label}
                          </Typography>
                        </Box>
                      }
                      size="small"
                      onDelete={() =>
                        setSelectedFilterIcons(
                          selectedFilterIcons.filter((id) => id !== iconId)
                        )
                      }
                      color="primary"
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="40" align="center">
                    Contract
                  </TableCell>
                  <TableCell width="60">Icon</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Pets</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    sx={{
                      "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                    }}
                  >
                    {/* Contract Icon - Red by default, will turn green when valid */}
                    <TableCell align="center">
                      <Tooltip title="Contract not signed">
                        <DescriptionIcon
                          sx={{
                            color: "#d32f2f", // Red - unsigned
                            cursor: "pointer",
                            "&:hover": { opacity: 0.7 },
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleIconClick(e, customer)}
                      sx={{ cursor: "pointer", minWidth: 120 }}
                    >
                      {customer.customerIcons &&
                      customer.customerIcons.length > 0 ? (
                        <EmojiIconDisplay
                          icons={customer.customerIcons}
                          maxDisplay={3}
                          size="small"
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Click to add
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell
                      onClick={() => handleRowClick(customer.id)}
                      sx={{ cursor: "pointer" }}
                    >{`${customer.firstName} ${customer.lastName}`}</TableCell>
                    <TableCell
                      onClick={() => handleRowClick(customer.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      {customer.pets && customer.pets.length > 0 ? (
                        <Typography
                          variant="body2"
                          sx={{ fontSize: "0.85rem" }}
                        >
                          {customer.pets
                            .map((pet: { name: string }) => pet.name)
                            .join(", ")}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: "0.85rem" }}
                        >
                          No pets
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell
                      onClick={() => handleRowClick(customer.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      {customer.email}
                    </TableCell>
                    <TableCell
                      onClick={() => handleRowClick(customer.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      {customer.phone}
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={(e) => handleDelete(e, customer.id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Icon Selector Dialog */}
      {selectedCustomer && (
        <Dialog
          open={iconSelectorOpen}
          onClose={() => {
            // Save on close
            handleIconSave(tempSelectedIcons, tempIconNotes);
            setIconSelectorOpen(false);
            setSelectedCustomer(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Manage Icons for {selectedCustomer.firstName}{" "}
            {selectedCustomer.lastName}
          </DialogTitle>
          <DialogContent>
            <CustomerIconSelectorNew
              selectedIcons={tempSelectedIcons}
              iconNotes={tempIconNotes}
              onChange={(icons, notes) => {
                setTempSelectedIcons(icons);
                setTempIconNotes(notes);
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                // Don't save, just close
                setIconSelectorOpen(false);
                setSelectedCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Save and close
                handleIconSave(tempSelectedIcons, tempIconNotes);
                setIconSelectorOpen(false);
                setSelectedCustomer(null);
              }}
              variant="contained"
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Customers;
