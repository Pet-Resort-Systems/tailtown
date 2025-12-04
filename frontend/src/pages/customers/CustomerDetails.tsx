import React, { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import PetsIcon from "@mui/icons-material/Pets";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useParams, useNavigate } from "react-router-dom";
import { Customer, customerService } from "../../services/customerService";
import AccountHistory from "../../components/customers/AccountHistory";
import CustomerIconSelectorNew from "../../components/customers/CustomerIconSelectorNew";
import CustomerIconBadges from "../../components/customers/CustomerIconBadges";
import CustomerDaycarePasses from "../../components/customers/CustomerDaycarePasses";
import PermanentDiscountSelector from "../../components/customers/PermanentDiscountSelector";
import {
  CustomerAgreementHistory,
  ServiceAgreementSign,
} from "../../components/agreements";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import DescriptionIcon from "@mui/icons-material/Description";
import DrawIcon from "@mui/icons-material/Draw";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Default empty customer state
const emptyCustomer: Customer = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  pets: [],
};

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewCustomer = !id || id === "new";

  // State management
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(isNewCustomer);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tabValue, setTabValue] = useState<number>(0);
  const [iconSelectorOpen, setIconSelectorOpen] = useState(false);
  const [selectedIcons, setSelectedIcons] = useState<string[]>(
    customer.customerIcons || []
  );
  const [iconNotes, setIconNotes] = useState<Record<string, string>>(
    customer.iconNotes || {}
  );
  const [signAgreementOpen, setSignAgreementOpen] = useState(false);

  // Fetch customer data
  const fetchCustomer = useCallback(async () => {
    if (isNewCustomer) {
      setCustomer(emptyCustomer);
      setLoading(false);
      return;
    }

    try {
      const data = await customerService.getCustomerById(id || "");
      setCustomer(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching customer:", error);
      setSnackbar({
        open: true,
        message: "Failed to load customer data",
        severity: "error",
      });
      setLoading(false);
    }
  }, [id, isNewCustomer]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // Update icon state when customer data changes
  useEffect(() => {
    if (customer.customerIcons) {
      setSelectedIcons(customer.customerIcons);
    }
    if (customer.iconNotes) {
      setIconNotes(customer.iconNotes);
    }
  }, [customer.customerIcons, customer.iconNotes]);

  // Handle tab changes
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const activeElement = document.activeElement;
    const activeElementId = activeElement ? activeElement.id : null;

    setCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Use setTimeout to ensure focus is restored after the state update and re-render
    setTimeout(() => {
      if (activeElementId) {
        const elementToFocus = document.getElementById(activeElementId);
        if (elementToFocus) {
          (elementToFocus as HTMLElement).focus();
        }
      }
    }, 0);
  };

  // Handle customer save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Include icon fields in customer data
      const customerData = {
        ...customer,
        customerIcons: selectedIcons,
        iconNotes: iconNotes,
      };

      if (isNewCustomer) {
        // Create the customer
        const newCustomer = await customerService.createCustomer(customerData);
        setSnackbar({
          open: true,
          message: "Customer created successfully",
          severity: "success",
        });

        // Check for redirect parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPath = urlParams.get("redirect");

        if (redirectPath) {
          // If there's a redirect parameter, navigate there
          navigate(redirectPath);
        } else {
          // Otherwise, go back to customers list
          navigate("/customers");
        }
      } else {
        await customerService.updateCustomer(id || "", customerData);
        setSnackbar({
          open: true,
          message: "Customer updated successfully",
          severity: "success",
        });
        setEditing(false);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      let errorMessage = "Failed to save customer";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Customer Form Component
  const CustomerForm = () => (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id="customer-firstName"
            label="First Name"
            name="firstName"
            value={customer.firstName}
            onChange={handleInputChange}
            disabled={!editing}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id="customer-lastName"
            label="Last Name"
            name="lastName"
            value={customer.lastName}
            onChange={handleInputChange}
            disabled={!editing}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id="customer-email"
            label="Email"
            name="email"
            type="email"
            value={customer.email}
            onChange={handleInputChange}
            disabled={!editing}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id="customer-phone"
            label="Phone"
            name="phone"
            value={customer.phone}
            onChange={handleInputChange}
            disabled={!editing}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="customer-address"
            label="Address"
            name="address"
            value={customer.address}
            onChange={handleInputChange}
            disabled={!editing}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            id="customer-city"
            label="City"
            name="city"
            value={customer.city}
            onChange={handleInputChange}
            disabled={!editing}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            id="customer-state"
            label="State"
            name="state"
            value={customer.state}
            onChange={handleInputChange}
            disabled={!editing}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            id="customer-zipCode"
            label="Zip Code"
            name="zipCode"
            value={customer.zipCode}
            onChange={handleInputChange}
            disabled={!editing}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  // Pet List Component
  const PetsList = () => (
    <>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" color="textSecondary">
          {customer.pets?.length || 0}{" "}
          {customer.pets?.length === 1 ? "pet" : "pets"} associated with this
          customer
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/pets/new?customerId=${id}`)}
        >
          Add Pet
        </Button>
      </Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search pets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        {customer.pets && customer.pets.length > 0 ? (
          <List>
            {customer.pets
              .filter(
                (pet: any) =>
                  pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (pet.breed || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  (pet.type || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
              )
              .map((pet: any) => (
                <ListItem
                  key={pet.id}
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    mb: 1,
                    "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                  }}
                >
                  <ListItemText
                    primary={pet.name}
                    secondary={
                      <>
                        {pet.type}
                        {pet.breed ? ` • ${pet.breed}` : ""}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => navigate(`/pets/${pet.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
          </List>
        ) : (
          <Typography variant="body1" color="textSecondary" align="center">
            No pets found. Click "Add Pet" to add one.
          </Typography>
        )}
      </Paper>
    </>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h1">
                {isNewCustomer
                  ? "New Customer"
                  : `${customer.firstName} ${customer.lastName}`}
              </Typography>
            </Box>
          </Box>
          {selectedIcons.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Customer Icons
              </Typography>
              <CustomerIconBadges
                iconIds={selectedIcons}
                iconNotes={iconNotes}
                size="medium"
              />
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          {editing ? (
            <>
              <Button variant="contained" color="primary" onClick={handleSave}>
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIconSelectorOpen(true)}
                startIcon={<PersonIcon />}
              >
                Manage Icons
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  if (isNewCustomer) {
                    navigate("/customers");
                  } else {
                    setEditing(false);
                  }
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setEditing(true)}
              >
                Edit Customer
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<DrawIcon />}
                onClick={() => setSignAgreementOpen(true)}
              >
                Sign Agreement
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigate("/customers")}
              >
                Back to Customers
              </Button>
            </>
          )}
        </Box>

        {/* Tabs - only show when not editing */}
        {!isNewCustomer && !editing && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="customer tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                icon={<PersonIcon />}
                iconPosition="start"
                label="Customer Info"
              />
              <Tab icon={<PetsIcon />} iconPosition="start" label="Pets" />
              <Tab
                icon={<ConfirmationNumberIcon />}
                iconPosition="start"
                label="Daycare Passes"
              />
              <Tab
                icon={<AccountBalanceWalletIcon />}
                iconPosition="start"
                label="Account History"
              />
              <Tab
                icon={<DescriptionIcon />}
                iconPosition="start"
                label="Agreements"
              />
            </Tabs>
          </Box>
        )}

        {/* Main content based on editing status or tab selection */}
        {editing ? (
          <form onSubmit={handleSave}>
            <CustomerForm />
          </form>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <CustomerForm />
              {!isNewCustomer && id && (
                <PermanentDiscountSelector customerId={id} />
              )}
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <PetsList />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Daycare Passes
                </Typography>
                <CustomerDaycarePasses customerId={id || ""} />
              </Box>
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Account History & Balance
                </Typography>
                <AccountHistory customerId={id || ""} />
              </Box>
            </TabPanel>
            <TabPanel value={tabValue} index={4}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Service Agreements
                </Typography>
                <CustomerAgreementHistory customerId={id || ""} />
              </Box>
            </TabPanel>
          </>
        )}

        {/* Icon Selector Dialog */}
        <Dialog
          open={iconSelectorOpen}
          onClose={() => setIconSelectorOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Manage Customer Icons</DialogTitle>
          <DialogContent>
            <CustomerIconSelectorNew
              selectedIcons={selectedIcons}
              iconNotes={iconNotes}
              onChange={(icons, notes) => {
                setSelectedIcons(icons);
                setIconNotes(notes);
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIconSelectorOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Sign Agreement Dialog */}
        <Dialog
          open={signAgreementOpen}
          onClose={() => setSignAgreementOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Sign Service Agreement - {customer.firstName} {customer.lastName}
          </DialogTitle>
          <DialogContent>
            {id && (
              <ServiceAgreementSign
                customerId={id}
                customerName={`${customer.firstName} ${customer.lastName}`}
                onComplete={() => {
                  setSignAgreementOpen(false);
                  setSnackbar({
                    open: true,
                    message: "Agreement signed successfully!",
                    severity: "success",
                  });
                  // Switch to Agreements tab to show the new agreement
                  setTabValue(4);
                }}
                onCancel={() => setSignAgreementOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Snackbar for notifications */}
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
      </Box>
    </Container>
  );
};

export default CustomerDetails;
