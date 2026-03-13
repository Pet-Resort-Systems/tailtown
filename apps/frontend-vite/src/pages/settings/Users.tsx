import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Divider,
  SelectChangeEvent,
  Tabs,
  Tab,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Percent as PercentIcon,
  Repeat as RepeatIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import staffService, { Staff } from "../../services/staffService";
import { CircularProgress, Alert, Snackbar } from "@mui/material";
import StaffSchedulingTabs from "../../components/staff/StaffSchedulingTabs";
import CommissionSettings from "../../components/staff/CommissionSettings";
import ScheduleTemplates from "../../components/staff/ScheduleTemplates";
import {
  validatePassword,
  getPasswordStrength,
} from "../../utils/passwordValidator";

// Available roles, departments, and positions
const roles = ["Administrator", "Manager", "Staff", "Instructor"];
const departments = [
  "Management",
  "Front Desk",
  "Grooming",
  "Training",
  "Kennel",
  "Veterinary",
];
const positions = [
  "General Manager",
  "Front Desk Manager",
  "Front Desk Associate",
  "Lead Groomer",
  "Groomer",
  "Dog Trainer",
  "Instructor",
  "Kennel Manager",
  "Kennel Technician",
  "Veterinarian",
  "Vet Technician",
];

interface FormDataType extends Staff {
  confirmPassword?: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Staff | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [dialogTabValue, setDialogTabValue] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormDataType>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    department: "",
    position: "",
    status: "Active",
    hireDate: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        password: user.password || "",
        confirmPassword: user.password || "",
        role: user.role || "",
        department: user.department || "",
        position: user.position || "",
        status: user.status || "Active",
        hireDate: user.hireDate || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
        department: "",
        position: "",
        status: "Active",
        hireDate: new Date().toISOString().split("T")[0],
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogTabValue(0); // Reset to first tab when closing
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setDialogTabValue(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Validate password in real-time
    if (name === "password" && value) {
      const validation = validatePassword(value);
      setPasswordErrors(validation.errors);
    } else if (name === "password" && !value) {
      setPasswordErrors([]);
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Load all staff members when component mounts
  const loadStaffMembers = useCallback(async () => {
    try {
      setLoading(true);
      const staffData = await staffService.getAllStaff();
      setUsers(staffData);
      setError(null);
    } catch (err) {
      console.error("Failed to load staff members:", err);
      setError("Failed to load staff members. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffMembers();
  }, [loadStaffMembers]);

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSubmit = async () => {
    // Validate password for new users
    if (!editingUser && formData.password) {
      const validation = validatePassword(formData.password);
      if (!validation.isValid) {
        showSnackbar(
          `Password validation failed: ${validation.errors.join(", ")}`,
          "error"
        );
        return;
      }
    }

    // Validate passwords match for new users or when changing password
    if (!editingUser && formData.password !== formData.confirmPassword) {
      showSnackbar("Passwords do not match", "error");
      return;
    }

    // Remove confirmPassword from data before saving
    const { confirmPassword, ...dataToSave } = formData;

    try {
      if (editingUser && editingUser.id) {
        // If password is empty, remove it from the data to be sent
        const dataToUpdate = { ...dataToSave };
        if (!dataToUpdate.password) {
          delete dataToUpdate.password;
        }

        // Update existing user
        await staffService.updateStaff(editingUser.id, dataToUpdate);
        showSnackbar("Staff member updated successfully", "success");
      } else {
        // Add new user
        await staffService.createStaff(dataToSave as Staff);
        showSnackbar("Staff member added successfully", "success");
      }

      // Reload staff members to get the updated list
      await loadStaffMembers();
      handleCloseDialog();
    } catch (err) {
      console.error("Error saving staff member:", err);
      showSnackbar("Failed to save staff member. Please try again.", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await staffService.deleteStaff(userId);
      showSnackbar("Staff member deleted successfully", "success");
      await loadStaffMembers();
    } catch (err) {
      console.error("Error deleting staff member:", err);
      showSnackbar("Failed to delete staff member. Please try again.", "error");
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Button
            component={Link}
            to="/settings"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back to Settings
          </Button>
          <Typography variant="h4" component="h1">
            User Management
          </Typography>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h6">Employees</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Employee
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Position</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No staff members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            color={
                              user.role === "Administrator"
                                ? "primary"
                                : user.role === "Manager"
                                ? "secondary"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>{user.position}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.status}
                            color={
                              user.status === "Active" ? "success" : "error"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              user.id ? handleDeleteUser(user.id) : undefined
                            }
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Add/Edit User Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth={dialogTabValue === 0 ? "xs" : "md"}
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {editingUser
            ? `Edit Employee: ${editingUser.firstName} ${editingUser.lastName}`
            : "Add New Employee"}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {editingUser && (
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs
                value={dialogTabValue}
                onChange={handleTabChange}
                aria-label="staff dialog tabs"
              >
                <Tab
                  icon={<PersonIcon fontSize="small" />}
                  label="Basic Information"
                  id="staff-tab-0"
                  aria-controls="staff-tabpanel-0"
                  iconPosition="start"
                />
                <Tab
                  icon={<ScheduleIcon fontSize="small" />}
                  label="Availability"
                  id="staff-tab-1"
                  aria-controls="staff-tabpanel-1"
                  iconPosition="start"
                />
                <Tab
                  icon={<PercentIcon fontSize="small" />}
                  label="Commissions"
                  id="staff-tab-2"
                  aria-controls="staff-tabpanel-2"
                  iconPosition="start"
                />
                <Tab
                  icon={<RepeatIcon fontSize="small" />}
                  label="Schedule Templates"
                  id="staff-tab-3"
                  aria-controls="staff-tabpanel-3"
                  iconPosition="start"
                />
              </Tabs>
            </Box>
          )}

          {/* Basic Information Tab */}
          <Box
            role="tabpanel"
            hidden={dialogTabValue !== 0}
            id="staff-tabpanel-0"
            aria-labelledby="staff-tab-0"
          >
            {dialogTabValue === 0 && (
              <Box>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      name="firstName"
                      label="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="lastName"
                      label="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                      required
                    />
                  </Grid>
                </Grid>

                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                  margin="dense"
                  required
                />

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      name="phone"
                      label="Phone Number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="address"
                      label="Address"
                      value={formData.address}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <TextField
                      name="city"
                      label="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      name="state"
                      label="State"
                      value={formData.state}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      name="zipCode"
                      label="Zip Code"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                  Security
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      name="password"
                      label={editingUser ? "New Password" : "Password"}
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                      required={!editingUser}
                      error={passwordErrors.length > 0}
                      helperText={
                        editingUser ? "Leave blank to keep current" : ""
                      }
                    />
                    {formData.password && (
                      <Box sx={{ mt: 0.5 }}>
                        {passwordErrors.length > 0 ? (
                          <Box>
                            {passwordErrors.map((error, index) => (
                              <Typography
                                key={index}
                                variant="caption"
                                color="error"
                                display="block"
                              >
                                • {error}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <LinearProgress
                              variant="determinate"
                              value={100}
                              sx={{
                                flexGrow: 1,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: "#e0e0e0",
                                "& .MuiLinearProgress-bar": {
                                  backgroundColor: getPasswordStrength(
                                    formData.password
                                  ).color,
                                },
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                color: getPasswordStrength(formData.password)
                                  .color,
                                fontWeight: "bold",
                              }}
                            >
                              {getPasswordStrength(formData.password).label}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="confirmPassword"
                      label="Confirm Password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                      required={!editingUser}
                      error={
                        formData.confirmPassword !== "" &&
                        formData.password !== formData.confirmPassword
                      }
                      helperText={
                        formData.confirmPassword !== "" &&
                        formData.password !== formData.confirmPassword
                          ? "Passwords do not match"
                          : ""
                      }
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                  Job Information
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel>Role</InputLabel>
                      <Select
                        name="role"
                        value={formData.role}
                        label="Role"
                        onChange={handleSelectChange}
                        required
                      >
                        {roles.map((role) => (
                          <MenuItem key={role} value={role}>
                            {role}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel>Department</InputLabel>
                      <Select
                        name="department"
                        value={formData.department}
                        label="Department"
                        onChange={handleSelectChange}
                        required
                      >
                        {departments.map((dept) => (
                          <MenuItem key={dept} value={dept}>
                            {dept}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel>Position</InputLabel>
                      <Select
                        name="position"
                        value={formData.position}
                        label="Position"
                        onChange={handleSelectChange}
                        required
                      >
                        {positions.map((pos) => (
                          <MenuItem key={pos} value={pos}>
                            {pos}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel>Status</InputLabel>
                      <Select
                        name="status"
                        value={formData.status}
                        label="Status"
                        onChange={handleSelectChange}
                        required
                      >
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      name="hireDate"
                      label="Hire Date"
                      type="date"
                      value={formData.hireDate}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      margin="dense"
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>

          {/* Availability Tab */}
          {editingUser && (
            <Box
              role="tabpanel"
              hidden={dialogTabValue !== 1}
              id="staff-tabpanel-1"
              aria-labelledby="staff-tab-1"
            >
              {dialogTabValue === 1 && editingUser.id && (
                <StaffSchedulingTabs
                  staffId={editingUser.id}
                  onSave={loadStaffMembers}
                />
              )}
            </Box>
          )}

          {/* Commissions Tab */}
          {editingUser && (
            <Box
              role="tabpanel"
              hidden={dialogTabValue !== 2}
              id="staff-tabpanel-2"
              aria-labelledby="staff-tab-2"
            >
              {dialogTabValue === 2 && editingUser.id && (
                <CommissionSettings
                  staffId={editingUser.id}
                  staffName={`${editingUser.firstName} ${editingUser.lastName}`}
                />
              )}
            </Box>
          )}

          {/* Schedule Templates Tab */}
          {editingUser && (
            <Box
              role="tabpanel"
              hidden={dialogTabValue !== 3}
              id="staff-tabpanel-3"
              aria-labelledby="staff-tab-3"
            >
              {dialogTabValue === 3 && editingUser.id && (
                <ScheduleTemplates
                  staffId={editingUser.id}
                  staffName={`${editingUser.firstName} ${editingUser.lastName}`}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} size="small">
            Close
          </Button>
          {dialogTabValue === 0 && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              size="small"
            >
              {editingUser ? "Update" : "Add"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Users;
