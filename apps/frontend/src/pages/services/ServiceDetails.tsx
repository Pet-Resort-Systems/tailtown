import React, { useState, useEffect, useCallback } from "react";
import {
  useParams,
  useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  SelectChangeEvent,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { serviceManagement } from "../../services/serviceManagement";
import {
  Service,
  ServiceCategory,
  AddOnService,
  DepositType,
} from "../../types/service";

interface AddOnFormData {
  name: string;
  description: string;
  price: number;
  duration: number;
}

/**
 * ServiceDetails component handles the creation and editing of service offerings.
 * Manages service data, pricing, and add-ons.
 */
const ServiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewService = !id;

  const [service, setService] = useState<Partial<Service>>({
    name: "",
    description: "",
    serviceCategory: ServiceCategory.DAYCARE,
    price: 0,
    duration: 0, // Explicitly set to 0
    requiresStaff: false,
    isActive: true,
    notes: "",
    availableAddOns: [],
    depositRequired: false,
    depositType: undefined,
    depositAmount: undefined,
  });

  const [loading, setLoading] = useState(!isNewService);
  const [saving, setSaving] = useState(false);
  const [newAddOn, setNewAddOn] = useState<AddOnFormData>({
    name: "",
    description: "",
    price: 0,
    duration: 0,
  });
  const [showAddOnForm, setShowAddOnForm] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning",
  });

  const loadService = useCallback(async () => {
    try {
      // Try to load the service with includeDeleted=true to handle deleted services
      const response = await serviceManagement.getServiceById(id!, true);
      setService(response.data);

      // If the service is inactive, show a warning
      if (response.data && !response.data.isActive) {
        setSnackbar({
          open: true,
          message:
            "This service has been deactivated and is not available for booking",
          severity: "warning",
        });
      }

      setLoading(false);
    } catch (err: any) {
      // If service not found, navigate back to services list
      const errorMessage = err.message || "Failed to load service";

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });

      // Redirect back to services list after a short delay
      setTimeout(() => {
        navigate("/services");
      }, 2000);

      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    if (!isNewService) {
      loadService();
    }
  }, [isNewService, loadService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setService((prev: Partial<Service>) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setService((prev: Partial<Service>) => ({
      ...prev,
      [name]: checked,
    }));
  };

  /**
   * Updates the service category when changed in the dropdown.
   * @param event - The select change event containing the new category
   */
  const handleCategoryChange = (event: SelectChangeEvent<ServiceCategory>) => {
    setService((prev: Partial<Service>) => ({
      ...prev,
      serviceCategory: event.target.value as ServiceCategory,
    }));
  };

  const handleAddOnInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewAddOn((prev: AddOnFormData) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleAddAddOn = () => {
    setService((prev: Partial<Service>) => ({
      ...prev,
      availableAddOns: [...(prev.availableAddOns || []), newAddOn],
    }));
    setNewAddOn({
      name: "",
      description: "",
      price: 0,
      duration: 0,
    });
    setShowAddOnForm(false);
  };

  const handleRemoveAddOn = (index: number) => {
    setService((prev: Partial<Service>) => ({
      ...prev,
      availableAddOns: prev.availableAddOns?.filter(
        (_: AddOnService, i: number) => i !== index
      ),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log("Saving service:", service);

      // Always ensure isActive is set to true when saving
      const serviceToSave = {
        ...service,
        isActive: service.isActive !== undefined ? service.isActive : true,
      };

      if (isNewService) {
        await serviceManagement.createService(serviceToSave as Service);
      } else {
        await serviceManagement.updateService(id!, {
          name: serviceToSave.name,
          description: serviceToSave.description,
          duration: serviceToSave.duration,
          price: serviceToSave.price,
          color: serviceToSave.color,
          serviceCategory: serviceToSave.serviceCategory,
          isActive: serviceToSave.isActive,
          requiresStaff: serviceToSave.requiresStaff,
          notes: serviceToSave.notes,
          availableAddOns: serviceToSave.availableAddOns,
        });
      }

      setSnackbar({
        open: true,
        message: `Service ${isNewService ? "created" : "updated"} successfully`,
        severity: "success",
      });
      navigate("/services");
    } catch (err: any) {
      // Show the specific error message if available
      const errorMessage =
        err.message ||
        `Failed to ${isNewService ? "create" : "update"} service`;

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/services");
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50vh",
          }}
        >
          <Typography>Loading service...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
          {isNewService ? "New Service" : "Edit Service"}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Service Name"
                    name="name"
                    value={service.name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={service.description}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={service.serviceCategory}
                      onChange={handleCategoryChange}
                      label="Category"
                    >
                      {Object.values(ServiceCategory)
                        .filter(
                          (category: ServiceCategory) =>
                            category !== ServiceCategory.TRAINING
                        )
                        .map((category: ServiceCategory) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Price"
                    name="price"
                    type="number"
                    value={service.price}
                    onChange={handleInputChange}
                    InputProps={{
                      startAdornment: "$",
                    }}
                  />
                </Grid>

                {/* Deposit Configuration */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="overline" color="text.secondary">
                      Deposit Configuration
                    </Typography>
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={service.depositRequired || false}
                        onChange={handleSwitchChange}
                        name="depositRequired"
                      />
                    }
                    label="Require Deposit"
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ ml: 4, mt: -1 }}
                  >
                    Customers must pay a deposit when booking this service
                  </Typography>
                </Grid>

                {service.depositRequired && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Deposit Type</InputLabel>
                        <Select
                          value={service.depositType || DepositType.PERCENTAGE}
                          onChange={(e: SelectChangeEvent) => {
                            const depositType = e.target.value as DepositType;
                            setService((prev: Partial<Service>) => ({
                              ...prev,
                              depositType,
                              // Reset deposit amount when type changes
                              depositAmount:
                                depositType === DepositType.PERCENTAGE
                                  ? 50
                                  : (prev.price || 0) * 0.5,
                            }));
                          }}
                          label="Deposit Type"
                        >
                          <MenuItem value={DepositType.PERCENTAGE}>
                            Percentage of Price
                          </MenuItem>
                          <MenuItem value={DepositType.FIXED_AMOUNT}>
                            Fixed Dollar Amount
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={
                          service.depositType === DepositType.PERCENTAGE
                            ? "Deposit Percentage"
                            : "Deposit Amount"
                        }
                        name="depositAmount"
                        type="number"
                        value={service.depositAmount || 0}
                        onChange={handleInputChange}
                        InputProps={{
                          startAdornment:
                            service.depositType === DepositType.PERCENTAGE
                              ? ""
                              : "$",
                          endAdornment:
                            service.depositType === DepositType.PERCENTAGE
                              ? "%"
                              : "",
                          inputProps: {
                            min: 0,
                            max:
                              service.depositType === DepositType.PERCENTAGE
                                ? 100
                                : undefined,
                          },
                        }}
                        helperText={
                          service.depositType === DepositType.PERCENTAGE
                            ? `Deposit: $${(
                                ((service.price || 0) *
                                  (service.depositAmount || 0)) /
                                100
                              ).toFixed(2)}`
                            : `${(
                                ((service.depositAmount || 0) /
                                  (service.price || 1)) *
                                100
                              ).toFixed(0)}% of service price`
                        }
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <Typography variant="body2" sx={{ minWidth: "60px" }}>
                      Duration:
                    </Typography>
                    <TextField
                      label="Hours"
                      type="number"
                      InputProps={{ inputProps: { min: 0 } }}
                      value={
                        service.duration !== undefined
                          ? Math.floor(service.duration / 60)
                          : 0
                      }
                      onChange={(e) => {
                        const hours = parseInt(e.target.value) || 0;
                        const minutes =
                          service.duration !== undefined
                            ? service.duration % 60
                            : 0;
                        setService((prev) => ({
                          ...prev,
                          duration: hours * 60 + minutes,
                        }));
                      }}
                      size="small"
                      sx={{ width: "100px" }}
                    />
                    <TextField
                      label="Min"
                      select
                      value={String(
                        service.duration !== undefined
                          ? service.duration % 60
                          : 0
                      )}
                      onChange={(e) => {
                        const minutes = parseInt(e.target.value) || 0;
                        const hours =
                          service.duration !== undefined
                            ? Math.floor(service.duration / 60)
                            : 0;
                        setService((prev) => ({
                          ...prev,
                          duration: hours * 60 + minutes,
                        }));
                      }}
                      size="small"
                      sx={{ width: "100px" }}
                    >
                      <MenuItem key={0} value={0}>
                        0
                      </MenuItem>
                      <MenuItem key={5} value={5}>
                        5
                      </MenuItem>
                      <MenuItem key={10} value={10}>
                        10
                      </MenuItem>
                      <MenuItem key={15} value={15}>
                        15
                      </MenuItem>
                      <MenuItem key={20} value={20}>
                        20
                      </MenuItem>
                      <MenuItem key={25} value={25}>
                        25
                      </MenuItem>
                      <MenuItem key={30} value={30}>
                        30
                      </MenuItem>
                      <MenuItem key={35} value={35}>
                        35
                      </MenuItem>
                      <MenuItem key={40} value={40}>
                        40
                      </MenuItem>
                      <MenuItem key={45} value={45}>
                        45
                      </MenuItem>
                      <MenuItem key={50} value={50}>
                        50
                      </MenuItem>
                      <MenuItem key={55} value={55}>
                        55
                      </MenuItem>
                    </TextField>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={service.notes}
                    onChange={handleInputChange}
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={service.taxable !== false}
                        onChange={handleSwitchChange}
                        name="taxable"
                      />
                    }
                    label="Taxable"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={service.requiresStaff}
                        onChange={handleSwitchChange}
                        name="requiresStaff"
                      />
                    }
                    label="Requires Staff"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={service.isActive}
                        onChange={handleSwitchChange}
                        name="isActive"
                      />
                    }
                    label="Active"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Add-On Services</Typography>
                {!showAddOnForm && (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddOnForm(true)}
                    size="small"
                  >
                    Add
                  </Button>
                )}
              </Box>

              {showAddOnForm && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Name"
                        name="name"
                        value={newAddOn.name}
                        onChange={handleAddOnInputChange}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={newAddOn.description}
                        onChange={handleAddOnInputChange}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Price"
                        name="price"
                        type="number"
                        value={newAddOn.price}
                        onChange={handleAddOnInputChange}
                        size="small"
                        InputProps={{
                          startAdornment: "$",
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Duration"
                        name="duration"
                        type="number"
                        value={newAddOn.duration}
                        onChange={handleAddOnInputChange}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button
                          size="small"
                          onClick={() => setShowAddOnForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleAddAddOn}
                          disabled={!newAddOn.name}
                        >
                          Add
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {service.availableAddOns?.map(
                (addOn: AddOnService, index: number) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      mb: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      position: "relative",
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{ position: "absolute", top: 8, right: 8 }}
                      onClick={() => handleRemoveAddOn(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                    <Typography variant="subtitle1">{addOn.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {addOn.description}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        ${addOn.price} • {addOn.duration} min
                      </Typography>
                    </Box>
                  </Box>
                )
              )}
            </Paper>
          </Grid>
        </Grid>

        <Box
          sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "flex-end" }}
        >
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !service.name}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ServiceDetails;
