import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Paper,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { CheckInMedication } from "../../services/checkInService";

interface MedicationFormProps {
  medications: CheckInMedication[];
  onChange: (medications: CheckInMedication[]) => void;
}

const ADMINISTRATION_METHODS = [
  { value: "ORAL_PILL", label: "Oral Pill/Tablet" },
  { value: "ORAL_LIQUID", label: "Oral Liquid" },
  { value: "TOPICAL", label: "Topical (Applied to skin)" },
  { value: "INJECTION", label: "Injection" },
  { value: "EYE_DROPS", label: "Eye Drops" },
  { value: "EAR_DROPS", label: "Ear Drops" },
  { value: "INHALER", label: "Inhaler" },
  { value: "TRANSDERMAL_PATCH", label: "Transdermal Patch" },
  { value: "OTHER", label: "Other" },
];

const MedicationForm: React.FC<MedicationFormProps> = ({
  medications,
  onChange,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localMedications, setLocalMedications] =
    useState<CheckInMedication[]>(medications);

  useEffect(() => {
    setLocalMedications(medications);
  }, [medications]);

  const handleAddMedication = () => {
    const newMedication: CheckInMedication = {
      medicationName: "",
      dosage: "",
      frequency: "",
      administrationMethod: "ORAL_PILL",
      withFood: false,
    };
    const updated = [...localMedications, newMedication];
    setLocalMedications(updated);
    onChange(updated);
    setEditingIndex(localMedications.length);
  };

  const handleUpdateMedication = (
    index: number,
    field: keyof CheckInMedication,
    value: any
  ) => {
    const updated = [...localMedications];
    updated[index] = { ...updated[index], [field]: value };
    setLocalMedications(updated);
    onChange(updated);
  };

  const handleRemoveMedication = (index: number) => {
    const updated = localMedications.filter((_, i) => i !== index);
    setLocalMedications(updated);
    onChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Medications</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddMedication}
        >
          Add Medication
        </Button>
      </Box>

      {localMedications.length === 0 && (
        <Paper sx={{ p: 3, textAlign: "center", bgcolor: "grey.50" }}>
          <Typography color="text.secondary">
            No medications added. Click "Add Medication" to add one.
          </Typography>
        </Paper>
      )}

      {localMedications.map((medication, index) => (
        <Paper key={index} sx={{ p: 3, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Medication {index + 1}
              {medication.medicationName && `: ${medication.medicationName}`}
            </Typography>
            <IconButton
              color="error"
              aria-label="Delete"
              onClick={() => handleRemoveMedication(index)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Medication Name *"
                value={medication.medicationName}
                onChange={(e) =>
                  handleUpdateMedication(
                    index,
                    "medicationName",
                    e.target.value
                  )
                }
                placeholder="e.g., Prednisone, Rimadyl"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Dosage *"
                value={medication.dosage}
                onChange={(e) =>
                  handleUpdateMedication(index, "dosage", e.target.value)
                }
                placeholder="e.g., 10mg, 1 tablet, 2 drops"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Frequency *"
                value={medication.frequency}
                onChange={(e) =>
                  handleUpdateMedication(index, "frequency", e.target.value)
                }
                placeholder="e.g., Twice daily, Every 8 hours"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id={`administration-method-label-${index}`}>
                  Administration Method
                </InputLabel>
                <Select
                  id={`administration-method-${index}`}
                  labelId={`administration-method-label-${index}`}
                  value={medication.administrationMethod}
                  onChange={(e) =>
                    handleUpdateMedication(
                      index,
                      "administrationMethod",
                      e.target.value
                    )
                  }
                  label="Administration Method"
                  renderValue={(selected) => {
                    const method = ADMINISTRATION_METHODS.find(
                      (m) => m.value === selected
                    );
                    return method ? `(${method.label})` : String(selected);
                  }}
                >
                  {ADMINISTRATION_METHODS.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Time(s) of Day"
                value={medication.timeOfDay || ""}
                onChange={(e) =>
                  handleUpdateMedication(index, "timeOfDay", e.target.value)
                }
                placeholder="e.g., 8:00 AM, 8:00 PM"
                helperText="When should this medication be given?"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medication.withFood}
                    onChange={(e) =>
                      handleUpdateMedication(
                        index,
                        "withFood",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Give with food"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prescribing Veterinarian"
                value={medication.prescribingVet || ""}
                onChange={(e) =>
                  handleUpdateMedication(
                    index,
                    "prescribingVet",
                    e.target.value
                  )
                }
                placeholder="Dr. Smith, ABC Veterinary Clinic"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={medication.startDate || ""}
                  onChange={(e) =>
                    handleUpdateMedication(index, "startDate", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={medication.endDate || ""}
                  onChange={(e) =>
                    handleUpdateMedication(index, "endDate", e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Special Instructions"
                value={medication.specialInstructions || ""}
                onChange={(e) =>
                  handleUpdateMedication(
                    index,
                    "specialInstructions",
                    e.target.value
                  )
                }
                placeholder="Any special instructions for administering this medication"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Additional Notes"
                value={medication.notes || ""}
                onChange={(e) =>
                  handleUpdateMedication(index, "notes", e.target.value)
                }
                placeholder="Any other information about this medication"
              />
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );
};

export default MedicationForm;
