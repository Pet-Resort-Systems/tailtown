import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  IconButton,
  Collapse,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Pets as PetsIcon,
  LocalHospital as VetIcon,
  Phone as PhoneIcon,
  Vaccines as VaccineIcon,
  Restaurant as FoodIcon,
  Psychology as BehaviorIcon,
  MedicalServices as MedicalIcon,
  ContactPhone as EmergencyIcon,
  History as HistoryIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import checkInService from "../../services/checkInService";
import PetIconDisplay from "../pets/PetIconDisplay";

interface VaccinationStatus {
  [key: string]: "current" | "expired" | "expiring_soon" | "missing";
}

interface VaccineExpirations {
  [key: string]: string;
}

interface Pet {
  id: string;
  name: string;
  type: "DOG" | "CAT";
  breed?: string;
  color?: string;
  weight?: number;
  birthdate?: string;
  profilePhoto?: string;
  petIcons?: string[];
  vetName?: string;
  vetPhone?: string;
  vaccinationStatus?: VaccinationStatus;
  vaccineExpirations?: VaccineExpirations;
  idealPlayGroup?: string;
  notes?: string;
  medicationNotes?: string;
  allergies?: string;
  foodNotes?: string;
  behaviorNotes?: string;
  specialNeeds?: string;
}

interface PetSummaryCardProps {
  pet: Pet;
  onUpdatePet?: (updates: Partial<Pet>) => Promise<void>;
  showEditButtons?: boolean;
  customerId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  onUpdateCustomer?: (updates: {
    emergencyContact?: string;
    emergencyPhone?: string;
  }) => Promise<void>;
}

interface PreviousCheckIn {
  id: string;
  createdAt: string;
  status: string;
  checkInNotes?: string;
  reservation?: {
    startDate: string;
    endDate: string;
  };
}

const PetSummaryCard: React.FC<PetSummaryCardProps> = ({
  pet,
  onUpdatePet,
  showEditButtons = true,
  emergencyContact,
  emergencyPhone,
  onUpdateCustomer,
}) => {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    vaccines: true,
    notes: false,
    handling: false,
    history: false,
  });
  const [editingVet, setEditingVet] = useState(false);
  const [vetName, setVetName] = useState(pet.vetName || "");
  const [vetPhone, setVetPhone] = useState(pet.vetPhone || "");

  // Emergency contact editing
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [emergencyName, setEmergencyName] = useState(emergencyContact || "");
  const [emergencyPhoneValue, setEmergencyPhoneValue] = useState(
    emergencyPhone || ""
  );

  // Vaccine quick-add
  const [addingVaccine, setAddingVaccine] = useState(false);
  const [newVaccineName, setNewVaccineName] = useState("");
  const [newVaccineDate, setNewVaccineDate] = useState("");

  // Pet history
  const [previousCheckIns, setPreviousCheckIns] = useState<PreviousCheckIn[]>(
    []
  );
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load pet history when history section is expanded
  useEffect(() => {
    if (
      expandedSections.history &&
      previousCheckIns.length === 0 &&
      !loadingHistory
    ) {
      loadPetHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedSections.history]);

  const loadPetHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await checkInService.getAllCheckIns({ petId: pet.id });
      if (response?.data) {
        setPreviousCheckIns(response.data.slice(0, 5)); // Last 5 check-ins
      }
    } catch (err) {
      console.error("Error loading pet history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSaveVet = async () => {
    if (onUpdatePet) {
      await onUpdatePet({ vetName, vetPhone });
    }
    setEditingVet(false);
  };

  const handleSaveEmergency = async () => {
    if (onUpdateCustomer) {
      await onUpdateCustomer({
        emergencyContact: emergencyName,
        emergencyPhone: emergencyPhoneValue,
      });
    }
    setEditingEmergency(false);
  };

  const handleAddVaccine = async () => {
    if (onUpdatePet && newVaccineName && newVaccineDate) {
      const updatedVaccines = {
        ...(pet.vaccineExpirations || {}),
        [newVaccineName]: newVaccineDate,
      };
      await onUpdatePet({ vaccineExpirations: updatedVaccines } as any);
      setAddingVaccine(false);
      setNewVaccineName("");
      setNewVaccineDate("");
    }
  };

  // Calculate vaccine alerts
  const getVaccineAlerts = () => {
    const alerts: {
      type: "error" | "warning" | "success";
      message: string;
      vaccine: string;
    }[] = [];

    if (!pet.vaccinationStatus || !pet.vaccineExpirations) {
      return [
        {
          type: "warning" as const,
          message: "No vaccination records on file",
          vaccine: "all",
        },
      ];
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    Object.entries(pet.vaccineExpirations).forEach(([vaccine, expDateStr]) => {
      const expDate = new Date(expDateStr);

      if (expDate < today) {
        alerts.push({
          type: "error",
          message: `${vaccine} expired on ${expDate.toLocaleDateString()}`,
          vaccine,
        });
      } else if (expDate < thirtyDaysFromNow) {
        alerts.push({
          type: "warning",
          message: `${vaccine} expires on ${expDate.toLocaleDateString()}`,
          vaccine,
        });
      }
    });

    return alerts;
  };

  const vaccineAlerts = getVaccineAlerts();
  const hasExpiredVaccines = vaccineAlerts.some((a) => a.type === "error");
  const hasExpiringVaccines = vaccineAlerts.some((a) => a.type === "warning");

  // Get pet age
  const getAge = () => {
    if (!pet.birthdate) return null;
    const birth = new Date(pet.birthdate);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    if (years > 0) {
      return `${years} year${years > 1 ? "s" : ""} old`;
    }
    return `${months} month${months > 1 ? "s" : ""} old`;
  };

  // Check for special handling flags
  const hasSpecialHandling =
    pet.petIcons &&
    pet.petIcons.some(
      (icon) =>
        icon.includes("aggressive") ||
        icon.includes("caution") ||
        icon.includes("bite") ||
        icon.includes("escape")
    );

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header with Photo and Basic Info */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar
              src={pet.profilePhoto}
              sx={{
                width: 150,
                height: 150,
                mb: 2,
                border: hasExpiredVaccines
                  ? "4px solid #f44336"
                  : hasExpiringVaccines
                  ? "4px solid #ff9800"
                  : "4px solid #4caf50",
              }}
            >
              <PetsIcon sx={{ fontSize: 80 }} />
            </Avatar>
            <Typography variant="h5" fontWeight="bold">
              {pet.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pet.breed || pet.type} {pet.color && `• ${pet.color}`}
            </Typography>
            {getAge() && (
              <Typography variant="body2" color="text.secondary">
                {getAge()} {pet.weight && `• ${pet.weight} lbs`}
              </Typography>
            )}

            {/* Pet Icons */}
            {pet.petIcons && pet.petIcons.length > 0 && (
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                <PetIconDisplay iconIds={pet.petIcons} size="small" />
              </Box>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={8}>
          {/* Alerts Section */}
          {(hasExpiredVaccines ||
            hasExpiringVaccines ||
            hasSpecialHandling) && (
            <Box sx={{ mb: 3 }}>
              {hasExpiredVaccines && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  <AlertTitle>Expired Vaccinations</AlertTitle>
                  {vaccineAlerts
                    .filter((a) => a.type === "error")
                    .map((a, i) => (
                      <div key={i}>{a.message}</div>
                    ))}
                </Alert>
              )}
              {hasExpiringVaccines && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <AlertTitle>Vaccinations Expiring Soon</AlertTitle>
                  {vaccineAlerts
                    .filter((a) => a.type === "warning")
                    .map((a, i) => (
                      <div key={i}>{a.message}</div>
                    ))}
                </Alert>
              )}
              {hasSpecialHandling && (
                <Alert severity="warning" icon={<WarningIcon />}>
                  <AlertTitle>Special Handling Required</AlertTitle>
                  Review pet icons and notes before proceeding
                </Alert>
              )}
            </Box>
          )}

          {/* Vet Information */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                <VetIcon
                  sx={{ mr: 1, verticalAlign: "middle", fontSize: 20 }}
                />
                Veterinarian
              </Typography>
              {showEditButtons && (
                <IconButton size="small" onClick={() => setEditingVet(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            {pet.vetName ? (
              <>
                <Typography>{pet.vetName}</Typography>
                {pet.vetPhone && (
                  <Typography variant="body2" color="text.secondary">
                    <PhoneIcon
                      sx={{ mr: 0.5, verticalAlign: "middle", fontSize: 16 }}
                    />
                    {pet.vetPhone}
                  </Typography>
                )}
              </>
            ) : (
              <Typography color="text.secondary" fontStyle="italic">
                No veterinarian on file
                {showEditButtons && (
                  <Button
                    size="small"
                    onClick={() => setEditingVet(true)}
                    sx={{ ml: 1 }}
                  >
                    Add Now
                  </Button>
                )}
              </Typography>
            )}
          </Paper>

          {/* Vaccination Status */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("vaccines")}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                <VaccineIcon
                  sx={{ mr: 1, verticalAlign: "middle", fontSize: 20 }}
                />
                Vaccination Status
              </Typography>
              {expandedSections.vaccines ? (
                <ExpandLessIcon />
              ) : (
                <ExpandMoreIcon />
              )}
            </Box>
            <Collapse in={expandedSections.vaccines}>
              <Box sx={{ mt: 2 }}>
                {pet.vaccineExpirations &&
                Object.keys(pet.vaccineExpirations).length > 0 ? (
                  <Grid container spacing={1}>
                    {Object.entries(pet.vaccineExpirations).map(
                      ([vaccine, expDate]) => {
                        const exp = new Date(expDate);
                        const today = new Date();
                        const thirtyDays = new Date();
                        thirtyDays.setDate(today.getDate() + 30);
                        const isExpired = exp < today;
                        const isExpiring = exp < thirtyDays && !isExpired;

                        return (
                          <Grid item xs={6} sm={4} key={vaccine}>
                            <Chip
                              icon={
                                isExpired ? (
                                  <ErrorIcon />
                                ) : isExpiring ? (
                                  <WarningIcon />
                                ) : (
                                  <CheckCircleIcon />
                                )
                              }
                              label={`${vaccine}: ${exp.toLocaleDateString()}`}
                              color={
                                isExpired
                                  ? "error"
                                  : isExpiring
                                  ? "warning"
                                  : "success"
                              }
                              variant="outlined"
                              size="small"
                              sx={{ width: "100%" }}
                            />
                          </Grid>
                        );
                      }
                    )}
                  </Grid>
                ) : (
                  <Typography color="text.secondary" fontStyle="italic">
                    No vaccination records on file
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Notes Sections */}
      <Grid container spacing={2}>
        {/* Food & Feeding */}
        {pet.foodNotes && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                <FoodIcon
                  sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }}
                />
                Feeding Notes
              </Typography>
              <Typography variant="body2">{pet.foodNotes}</Typography>
            </Paper>
          </Grid>
        )}

        {/* Behavior */}
        {pet.behaviorNotes && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                <BehaviorIcon
                  sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }}
                />
                Behavior Notes
              </Typography>
              <Typography variant="body2">{pet.behaviorNotes}</Typography>
            </Paper>
          </Grid>
        )}

        {/* Medical/Allergies */}
        {(pet.allergies || pet.medicationNotes) && (
          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{ p: 2, height: "100%", bgcolor: "error.50" }}
            >
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                gutterBottom
                color="error.main"
              >
                <MedicalIcon
                  sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }}
                />
                Medical / Allergies
              </Typography>
              {pet.allergies && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Allergies:</strong> {pet.allergies}
                </Typography>
              )}
              {pet.medicationNotes && (
                <Typography variant="body2">
                  <strong>Medications:</strong> {pet.medicationNotes}
                </Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* Special Needs */}
        {pet.specialNeeds && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Special Needs
              </Typography>
              <Typography variant="body2">{pet.specialNeeds}</Typography>
            </Paper>
          </Grid>
        )}

        {/* General Notes */}
        {pet.notes && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                General Notes
              </Typography>
              <Typography variant="body2">{pet.notes}</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Play Group */}
      {pet.idealPlayGroup && (
        <Box sx={{ mt: 2 }}>
          <Chip
            label={`Play Group: ${pet.idealPlayGroup}`}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

      {/* Emergency Contact Section */}
      <Box sx={{ mt: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            p: 1,
            bgcolor: "grey.50",
            borderRadius: 1,
          }}
          onClick={() => toggleSection("emergency")}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EmergencyIcon color="warning" />
            <Typography variant="subtitle1" fontWeight="bold">
              Emergency Contact
            </Typography>
          </Box>
          {expandedSections.emergency ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={expandedSections.emergency}>
          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1, mt: 1 }}>
            {emergencyContact || emergencyPhone ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body2">
                    <strong>Name:</strong> {emergencyContact || "Not set"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Phone:</strong> {emergencyPhone || "Not set"}
                  </Typography>
                </Box>
                {showEditButtons && onUpdateCustomer && (
                  <IconButton
                    size="small"
                    onClick={() => setEditingEmergency(true)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No emergency contact on file
                </Typography>
                {showEditButtons && onUpdateCustomer && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setEditingEmergency(true)}
                  >
                    Add Contact
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Vaccine Quick-Add Section */}
      {showEditButtons && onUpdatePet && (
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddingVaccine(true)}
          >
            Add Vaccine Record
          </Button>
        </Box>
      )}

      {/* Pet History Section */}
      <Box sx={{ mt: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            p: 1,
            bgcolor: "grey.50",
            borderRadius: 1,
          }}
          onClick={() => toggleSection("history")}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HistoryIcon color="info" />
            <Typography variant="subtitle1" fontWeight="bold">
              Previous Visits
            </Typography>
          </Box>
          {expandedSections.history ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={expandedSections.history}>
          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1, mt: 1 }}>
            {loadingHistory ? (
              <Typography variant="body2" color="text.secondary">
                Loading visit history...
              </Typography>
            ) : previousCheckIns.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {previousCheckIns.map((checkIn) => (
                  <Paper key={checkIn.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {checkIn.reservation?.startDate
                          ? new Date(
                              checkIn.reservation.startDate
                            ).toLocaleDateString()
                          : new Date(checkIn.createdAt).toLocaleDateString()}
                      </Typography>
                      <Chip
                        label={checkIn.status}
                        size="small"
                        color={
                          checkIn.status === "COMPLETED" ? "success" : "default"
                        }
                      />
                    </Box>
                    {checkIn.checkInNotes && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {checkIn.checkInNotes}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No previous visits on record
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Edit Vet Dialog */}
      <Dialog open={editingVet} onClose={() => setEditingVet(false)}>
        <DialogTitle>Edit Veterinarian Information</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Veterinarian Name"
            value={vetName}
            onChange={(e) => setVetName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={vetPhone}
            onChange={(e) => setVetPhone(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingVet(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveVet}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Emergency Contact Dialog */}
      <Dialog
        open={editingEmergency}
        onClose={() => setEditingEmergency(false)}
      >
        <DialogTitle>Edit Emergency Contact</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Contact Name"
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={emergencyPhoneValue}
            onChange={(e) => setEmergencyPhoneValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingEmergency(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEmergency}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Vaccine Dialog */}
      <Dialog open={addingVaccine} onClose={() => setAddingVaccine(false)}>
        <DialogTitle>Add Vaccine Record</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Vaccine Name"
            value={newVaccineName}
            onChange={(e) => setNewVaccineName(e.target.value)}
            placeholder="e.g., Rabies, DHPP, Bordetella"
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Expiration Date"
            type="date"
            value={newVaccineDate}
            onChange={(e) => setNewVaccineDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddingVaccine(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddVaccine}
            disabled={!newVaccineName || !newVaccineDate}
          >
            Add Vaccine
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PetSummaryCard;
