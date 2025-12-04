/**
 * Medication Tracker Component
 * Mobile-friendly interface for staff to log medication administration
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Medication as MedIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Check as CheckIcon,
  Close as SkipIcon,
  Schedule as TimeIcon,
  Pets as PetIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import careTrackingService, {
  CheckedInPet,
  PetMedication,
} from "../../services/careTrackingService";

interface MedicationTrackerProps {
  onComplete?: () => void;
}

const MedicationTracker: React.FC<MedicationTrackerProps> = ({
  onComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pets, setPets] = useState<CheckedInPet[]>([]);
  const [expandedPet, setExpandedPet] = useState<string | null>(null);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<{
    petId: string;
    medication: PetMedication;
  } | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Load pets needing medication
  useEffect(() => {
    const loadPets = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await careTrackingService.getPetsNeedingMedication();
        setPets(data);
      } catch (err: any) {
        console.error("Error loading pets:", err);
        setError("Failed to load pets needing medication");
      } finally {
        setLoading(false);
      }
    };
    loadPets();
  }, []);

  const handleAdminister = async (
    petId: string,
    medication: PetMedication,
    reservationId: string
  ) => {
    try {
      setSaving(`${petId}-${medication.id}`);
      setError(null);

      await careTrackingService.createMedicationLog({
        petId,
        medicationId: medication.id,
        reservationId,
        scheduledTime: new Date().toISOString(),
        wasAdministered: true,
        notes: notes[`${petId}-${medication.id}`],
      });

      setSuccess(
        `Logged ${medication.medicationName} for ${
          pets.find((p) => p.pet.id === petId)?.pet.name
        }`
      );
      setTimeout(() => setSuccess(null), 2000);

      // Reload to get updated logs
      const data = await careTrackingService.getPetsNeedingMedication();
      setPets(data);
    } catch (err: any) {
      console.error("Error logging medication:", err);
      setError("Failed to log medication");
    } finally {
      setSaving(null);
    }
  };

  const handleSkip = async () => {
    if (!selectedMed) return;

    try {
      setSaving(`${selectedMed.petId}-${selectedMed.medication.id}`);
      setError(null);

      const pet = pets.find((p) => p.pet.id === selectedMed.petId);

      await careTrackingService.createMedicationLog({
        petId: selectedMed.petId,
        medicationId: selectedMed.medication.id,
        reservationId: pet?.reservationId,
        scheduledTime: new Date().toISOString(),
        wasAdministered: false,
        skippedReason: skipReason,
      });

      setSuccess(`Skipped ${selectedMed.medication.medicationName}`);
      setTimeout(() => setSuccess(null), 2000);
      setSkipDialogOpen(false);
      setSelectedMed(null);
      setSkipReason("");

      // Reload
      const data = await careTrackingService.getPetsNeedingMedication();
      setPets(data);
    } catch (err: any) {
      console.error("Error skipping medication:", err);
      setError("Failed to skip medication");
    } finally {
      setSaving(null);
    }
  };

  const openSkipDialog = (petId: string, medication: PetMedication) => {
    setSelectedMed({ petId, medication });
    setSkipDialogOpen(true);
  };

  const getMedicationStatus = (
    medication: PetMedication
  ): "pending" | "given" | "skipped" => {
    const logs = medication.logs || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLog = logs.find((l) => {
      const logDate = new Date(l.scheduledTime);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    if (!todayLog) return "pending";
    return todayLog.wasAdministered ? "given" : "skipped";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <MedIcon color="primary" />
        <Typography variant="h5">Medication Tracker</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Pet List */}
      {pets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <MedIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
          <Typography color="text.secondary">
            No pets need medication today
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {pets.map((petData) => {
            const isExpanded = expandedPet === petData.pet.id;
            const pendingMeds = petData.pet.medications.filter(
              (m) => getMedicationStatus(m) === "pending"
            );

            return (
              <Card key={petData.pet.id} elevation={2}>
                <CardContent sx={{ pb: 1 }}>
                  {/* Pet Header */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Avatar
                      src={petData.pet.profilePhoto}
                      sx={{ width: 56, height: 56, bgcolor: "primary.light" }}
                    >
                      <PetIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="h6">{petData.pet.name}</Typography>
                        {pendingMeds.length > 0 && (
                          <Chip
                            icon={<WarningIcon />}
                            label={`${pendingMeds.length} pending`}
                            size="small"
                            color="warning"
                          />
                        )}
                        {pendingMeds.length === 0 && (
                          <Chip
                            icon={<CheckIcon />}
                            label="All done"
                            size="small"
                            color="success"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {petData.pet.breed} • {petData.customer.firstName}{" "}
                        {petData.customer.lastName}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() =>
                        setExpandedPet(isExpanded ? null : petData.pet.id)
                      }
                    >
                      {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                  </Box>

                  {/* Medications List */}
                  <List dense disablePadding>
                    {petData.pet.medications.map((med) => {
                      const status = getMedicationStatus(med);
                      const isSaving = saving === `${petData.pet.id}-${med.id}`;

                      return (
                        <ListItem
                          key={med.id}
                          sx={{
                            bgcolor:
                              status === "given"
                                ? "success.light"
                                : status === "skipped"
                                ? "grey.200"
                                : "warning.light",
                            borderRadius: 1,
                            mb: 1,
                            opacity: status !== "pending" ? 0.7 : 1,
                          }}
                          secondaryAction={
                            status === "pending" ? (
                              <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  startIcon={<CheckIcon />}
                                  onClick={() =>
                                    handleAdminister(
                                      petData.pet.id,
                                      med,
                                      petData.reservationId
                                    )
                                  }
                                  disabled={isSaving}
                                >
                                  {isSaving ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    "Given"
                                  )}
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<SkipIcon />}
                                  onClick={() =>
                                    openSkipDialog(petData.pet.id, med)
                                  }
                                  disabled={isSaving}
                                >
                                  Skip
                                </Button>
                              </Box>
                            ) : (
                              <Chip
                                label={status === "given" ? "Given" : "Skipped"}
                                size="small"
                                color={
                                  status === "given" ? "success" : "default"
                                }
                              />
                            )
                          }
                        >
                          <ListItemIcon>
                            <MedIcon
                              color={
                                status === "pending" ? "warning" : "disabled"
                              }
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={med.medicationName}
                            secondary={`${med.dosage} • ${med.frequency}`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>

                  {/* Expanded Section */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 2 }} />
                    {petData.pet.medications.map((med) => (
                      <Box key={med.id} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="primary">
                          {med.medicationName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Dosage:</strong> {med.dosage}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Frequency:</strong> {med.frequency}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Method:</strong> {med.administrationMethod}
                        </Typography>
                        {med.withFood && (
                          <Chip
                            label="Give with food"
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                        {med.specialInstructions && (
                          <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                            <Typography variant="body2">
                              {med.specialInstructions}
                            </Typography>
                          </Alert>
                        )}
                        {med.timeOfDay && med.timeOfDay.length > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              mt: 1,
                            }}
                          >
                            <TimeIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {med.timeOfDay.join(", ")}
                            </Typography>
                          </Box>
                        )}
                        <TextField
                          label="Notes (optional)"
                          value={notes[`${petData.pet.id}-${med.id}`] || ""}
                          onChange={(e) =>
                            setNotes({
                              ...notes,
                              [`${petData.pet.id}-${med.id}`]: e.target.value,
                            })
                          }
                          fullWidth
                          size="small"
                          sx={{ mt: 1 }}
                          placeholder="Any notes about this administration..."
                        />
                      </Box>
                    ))}
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onClose={() => setSkipDialogOpen(false)}>
        <DialogTitle>Skip Medication</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Why is {selectedMed?.medication.medicationName} being skipped?
          </Typography>
          <TextField
            label="Reason"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            fullWidth
            multiline
            rows={2}
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkipDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSkip}
            disabled={!skipReason.trim() || saving !== null}
          >
            {saving ? <CircularProgress size={16} /> : "Skip Medication"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Button */}
      {onComplete && pets.length > 0 && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button variant="contained" size="large" onClick={onComplete}>
            Done with Medications
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MedicationTracker;
