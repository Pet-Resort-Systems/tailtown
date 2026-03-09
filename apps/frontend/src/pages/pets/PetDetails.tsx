import React, { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
  Avatar,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Snackbar,
  Autocomplete,
  FormGroup,
  FormLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import VaccinationStatus from "../../components/VaccinationStatus";
import EmojiPetIconSelector from "../../components/pets/EmojiPetIconSelector";
import VaccineComplianceBadge from "../../components/pets/VaccineComplianceBadge";
import {
  PlaygroupBadge,
  CompatibilityFlags,
} from "../../components/compatibility";
import { SelectChangeEvent } from "@mui/material/Select";
import { Pet, petService } from "../../services/petService";
import { customerService } from "../../services/customerService";
import { getApiBaseUrl } from "../../services/api";
import referenceDataService, {
  Breed,
  Veterinarian,
  TemperamentType,
} from "../../services/referenceDataService";

/**
 * Map vaccination data from lowercase keys to component-expected capitalized keys
 */
export const mapVaccinationData = (vaccinationStatus: any) => {
  if (!vaccinationStatus) return {};

  const mapped: any = {};
  const keyMap: { [key: string]: string } = {
    rabies: "Rabies",
    dhpp: "DHPP",
    bordetella: "Bordetella",
    fvrcp: "FVRCP",
    canine_influenza: "Influenza",
    feline_leukemia: "Lepto", // Map to existing Lepto field
  };

  Object.entries(vaccinationStatus).forEach(([key, value]) => {
    const mappedKey = keyMap[key] || key;
    mapped[mappedKey] = value;
  });

  return mapped;
};

/**
 * Map vaccination expirations from lowercase keys to component-expected capitalized keys
 */
export const mapVaccinationExpirations = (vaccineExpirations: any) => {
  if (!vaccineExpirations) return {};

  const mapped: any = {};
  const keyMap: { [key: string]: string } = {
    rabies: "Rabies",
    dhpp: "DHPP",
    bordetella: "Bordetella",
    fvrcp: "FVRCP",
    canine_influenza: "Influenza",
    feline_leukemia: "Lepto", // Map to existing Lepto field
  };

  Object.entries(vaccineExpirations).forEach(([key, value]) => {
    const mappedKey = keyMap[key] || key;
    mapped[mappedKey] = value;
  });

  return mapped;
};

/**
 * PetDetails component handles the creation and editing of pet profiles.
 * It manages pet data, photo uploads, and customer associations.
 */
const PetDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewPet = id === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [petOwner, setPetOwner] = useState<any | null>(null);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [vets, setVets] = useState<Veterinarian[]>([]);
  const [temperamentTypes, setTemperamentTypes] = useState<TemperamentType[]>(
    []
  );
  const [selectedTemperaments, setSelectedTemperaments] = useState<string[]>(
    []
  );
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const [photoTimestamp, setPhotoTimestamp] = useState<number>(Date.now());
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [deactivationDate, setDeactivationDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [pet, setPet] = useState<
    Omit<Pet, "id" | "createdAt" | "updatedAt" | "medicalRecords">
  >({
    name: "",
    type: "DOG",
    breed: null,
    color: null,
    birthdate: null,
    weight: null,
    gender: null,
    isNeutered: false,
    microchipNumber: null,
    rabiesTagNumber: null,
    profilePhoto: null,
    specialNeeds: null,
    behaviorNotes: null,
    foodNotes: null,
    medicationNotes: null,
    allergies: null,
    vetName: null,
    vetPhone: null,
    veterinarianId: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelation: null,
    customerId: "",
    isActive: true,
    deactivatedAt: null,
    deactivationReason: null,
    petIcons: [],
    iconNotes: {},
    vaccinationStatus: undefined,
    vaccineExpirations: undefined,
  });

  const loadData = useCallback(async () => {
    try {
      // Load reference data
      const [breedsData, vetsData, temperamentsData] = await Promise.all([
        referenceDataService.getBreeds(),
        referenceDataService.getVeterinarians(),
        referenceDataService.getTemperamentTypes(),
      ]);

      setBreeds(breedsData);
      setVets(vetsData);
      setTemperamentTypes(temperamentsData);

      if (!isNewPet) {
        // Load existing pet data
        const petData = await petService.getPetById(id!);

        // Format the birthdate from ISO to YYYY-MM-DD for the input field
        if (petData.birthdate) {
          petData.birthdate = new Date(petData.birthdate)
            .toISOString()
            .split("T")[0];
        }

        // Process medical records to populate vaccination status
        if (petData.medicalRecords && petData.medicalRecords.length > 0) {
          const vaccinationStatus: any = {};
          const vaccineExpirations: any = {};
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

          petData.medicalRecords.forEach((record: any) => {
            if (record.recordType === "VACCINATION" && record.description) {
              // Map vaccine descriptions to field names (use lowercase to match backend)
              const vaccineMap: { [key: string]: string } = {
                "Rabies vaccination": "rabies",
                "DHPP vaccination": "dhpp",
                "Bordetella vaccination": "bordetella",
                "FVRCP vaccination": "fvrcp",
                "Canine Influenza vaccination": "influenza",
                "Lepto vaccination": "lepto",
                "Leptospirosis vaccination": "lepto",
              };

              const vaccineName = vaccineMap[record.description];
              if (vaccineName) {
                // Determine status based on expiration date
                if (record.expirationDate) {
                  const expirationDate = new Date(record.expirationDate);
                  expirationDate.setHours(0, 0, 0, 0);

                  // Set status based on whether vaccine is expired
                  // VaccinationStatus component expects uppercase status values
                  if (expirationDate >= today) {
                    vaccinationStatus[vaccineName] = { status: "CURRENT" };
                  } else {
                    vaccinationStatus[vaccineName] = { status: "EXPIRED" };
                  }

                  vaccineExpirations[vaccineName] = new Date(
                    record.expirationDate
                  )
                    .toISOString()
                    .split("T")[0];
                } else {
                  // No expiration date, mark as current
                  vaccinationStatus[vaccineName] = { status: "CURRENT" };
                }
              }
            }
          });

          petData.vaccinationStatus = vaccinationStatus;
          petData.vaccineExpirations = vaccineExpirations;
        }

        setPet(petData);

        // Load the specific owner for this pet
        if (petData.customerId) {
          try {
            const ownerData = await customerService.getCustomerById(
              petData.customerId
            );
            setPetOwner(ownerData);

            // Auto-populate veterinarian from customer's preferred vet if pet has no vet
            if (
              !petData.veterinarianId &&
              !petData.vetName &&
              ownerData.veterinarianId
            ) {
              // Find the veterinarian in our list
              const customerVet = vetsData.find(
                (v) => v.id === ownerData.veterinarianId
              );
              if (customerVet) {
                petData.veterinarianId = customerVet.id;
                petData.vetName = customerVet.name;
                petData.vetPhone = customerVet.phone || null;
              }
            }
          } catch {
            // Error loading pet owner - continue without owner data
          }
        }

        // Load pet temperaments
        try {
          const petTemperaments = await referenceDataService.getPetTemperaments(
            id!
          );
          setSelectedTemperaments(petTemperaments.map((t) => t.temperament));
        } catch {
          // No temperaments found for pet - this is expected for new pets
        }
      } else {
        // For new pets, load customers for the dropdown (with search capability)
        const customersData = await customerService.getAllCustomers(1, 100);
        setCustomers(customersData.data || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [id, isNewPet]);

  useEffect(() => {
    loadData();

    // Ensure proper scrolling behavior
    const enableScrolling = () => {
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
    };

    // Enable scrolling when component mounts
    enableScrolling();

    // Re-enable scrolling when component updates
    return () => {
      enableScrolling();
    };
  }, [loadData]);

  /**
   * Handles changes to text input fields, with special handling for dates and weights.
   * @param e - The change event from the input field
   */
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name) {
      if (name === "birthdate") {
      }
      setPet((prev) => {
        const newValue =
          name === "weight"
            ? value
              ? parseFloat(value)
              : null
            : name === "birthdate"
            ? value
              ? value
              : null
            : value;
        if (name === "birthdate") {
        }
        return {
          ...prev,
          [name]: newValue,
        };
      });
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setPet((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPet((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!pet.name || !pet.customerId) {
        setSnackbar({
          open: true,
          message: "Please fill in all required fields",
          severity: "error",
        });
        return;
      }

      // Clean up the data before sending
      const formattedDate = pet.birthdate
        ? new Date(pet.birthdate).toISOString().split("T")[0]
        : null;

      const cleanPetData = {
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        color: pet.color,
        birthdate: formattedDate,
        weight: pet.weight,
        gender: pet.gender,
        isNeutered: pet.isNeutered,
        microchipNumber: pet.microchipNumber,
        specialNeeds: pet.specialNeeds,
        behaviorNotes: pet.behaviorNotes,
        foodNotes: pet.foodNotes,
        medicationNotes: pet.medicationNotes,
        allergies: pet.allergies,
        vetName: pet.vetName,
        vetPhone: pet.vetPhone,
        veterinarianId: pet.veterinarianId,
        emergencyContactName: pet.emergencyContactName,
        emergencyContactPhone: pet.emergencyContactPhone,
        emergencyContactRelation: pet.emergencyContactRelation,
        petIcons: pet.petIcons || [],
        iconNotes: pet.iconNotes || {},
        vaccinationStatus: pet.vaccinationStatus || {},
        vaccineExpirations: pet.vaccineExpirations || {},
        customerId: pet.customerId,
        isActive: pet.isActive,
      };

      let savedPetId = id;

      if (isNewPet) {
        const newPet = await petService.createPet(
          cleanPetData as Omit<Pet, "id">
        );
        savedPetId = newPet.id;
      } else {
        await petService.updatePet(id!, cleanPetData);
      }

      // Save temperaments
      if (savedPetId && selectedTemperaments.length > 0) {
        try {
          await referenceDataService.updatePetTemperaments(
            savedPetId,
            selectedTemperaments
          );
        } catch (err) {
          console.error("Error saving temperaments:", err);
        }
      }

      setSnackbar({
        open: true,
        message: `Pet ${isNewPet ? "created" : "updated"} successfully`,
        severity: "success",
      });

      // Navigate back to pets list after successful save
      navigate("/pets");
    } catch (err) {
      console.error("Error saving pet:", err);
      setSnackbar({
        open: true,
        message: `Error ${isNewPet ? "creating" : "updating"} pet`,
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setSaving(true);
      await petService.deactivatePet(id!, deactivationReason, deactivationDate);
      setDeactivateDialogOpen(false);
      setSnackbar({
        open: true,
        message:
          "Pet has been deactivated. History preserved, communications stopped.",
        severity: "success",
      });
      // Reload pet data to show updated status
      loadData();
    } catch (err) {
      console.error("Error deactivating pet:", err);
      setSnackbar({
        open: true,
        message: "Error deactivating pet",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setSaving(true);
      await petService.reactivatePet(id!);
      setSnackbar({
        open: true,
        message: "Pet has been reactivated",
        severity: "success",
      });
      // Reload pet data to show updated status
      loadData();
    } catch (err) {
      console.error("Error reactivating pet:", err);
      setSnackbar({
        open: true,
        message: "Error reactivating pet",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
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
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant="h4">
            {isNewPet ? "New Pet" : pet.name}
          </Typography>
          {!isNewPet && !pet.isActive && (
            <Chip
              label={`Deactivated${
                pet.deactivatedAt
                  ? ` on ${new Date(pet.deactivatedAt).toLocaleDateString()}`
                  : ""
              }`}
              color="error"
              size="small"
            />
          )}
          {!isNewPet && id && pet.isActive && (
            <VaccineComplianceBadge petId={id} showDetails={true} />
          )}
        </Box>

        {/* Deactivation Warning Banner */}
        {!isNewPet && !pet.isActive && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleReactivate}
                disabled={saving}
              >
                Reactivate
              </Button>
            }
          >
            This pet has been deactivated
            {pet.deactivationReason ? `: ${pet.deactivationReason}` : ""}.
            Communications have been stopped and the pet will not appear in
            active lists.
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar
              src={
                pet.profilePhoto
                  ? pet.profilePhoto.startsWith("http")
                    ? `${pet.profilePhoto}?t=${photoTimestamp}`
                    : `${getApiBaseUrl()}${
                        pet.profilePhoto
                      }?t=${photoTimestamp}`
                  : undefined
              }
              alt={pet.name || "Pet"}
              onError={(e) => {
                // Reset image source on error and try a direct path without query parameters
                const imgElement = e.target as HTMLImageElement;
                const originalSrc = imgElement.src;

                // Only try the fallback once to avoid infinite loops
                if (originalSrc.includes("?")) {
                  const baseUrl = originalSrc.split("?")[0];
                  imgElement.src = baseUrl;
                } else {
                  // If fallback failed too, clear the src
                  imgElement.src = "";
                }
              }}
              sx={{
                width: 150,
                height: 150,
                border: "2px solid #e0e0e0",
                "& img": {
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                },
              }}
            />
            <Box>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="photo-upload"
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && !isNewPet && id) {
                    // Check file size (5MB limit)
                    if (file.size > 5 * 1024 * 1024) {
                      setSnackbar({
                        open: true,
                        message:
                          "File size too large. Please upload an image under 5MB.",
                        severity: "error",
                      });
                      return;
                    }

                    try {
                      setSaving(true);
                      const updatedPet = await petService.uploadPetPhoto(
                        id,
                        file
                      );

                      // Create a local cached URL to display immediately
                      if (updatedPet.profilePhoto) {
                        const imageUrl = updatedPet.profilePhoto.startsWith(
                          "http"
                        )
                          ? updatedPet.profilePhoto
                          : `${getApiBaseUrl()}${updatedPet.profilePhoto}`;

                        // Preload the image to ensure it's in browser cache
                        const preloadImg = new Image();
                        preloadImg.src = imageUrl;

                        setPet((prev) => ({
                          ...prev,
                          profilePhoto: updatedPet.profilePhoto,
                        }));
                      }

                      // Update timestamp to force image refresh
                      setPhotoTimestamp(Date.now());
                      setSnackbar({
                        open: true,
                        message: "Photo uploaded successfully",
                        severity: "success",
                      });
                    } catch (error) {
                      console.error("Error uploading photo:", error);
                      setSnackbar({
                        open: true,
                        message: "Error uploading photo",
                        severity: "error",
                      });
                    } finally {
                      setSaving(false);
                    }
                  }
                }}
              />
              <label htmlFor="photo-upload">
                <Button
                  variant="outlined"
                  component="span"
                  disabled={saving || isNewPet}
                >
                  {pet.profilePhoto ? "Change Photo" : "Add Photo"}
                </Button>
              </label>
              {isNewPet && (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  You can add a photo after creating the pet
                </Typography>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <FormControl fullWidth required>
              <TextField
                label="Name"
                name="name"
                value={pet.name || ""}
                onChange={handleTextChange}
                required
              />
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Type</InputLabel>
              <Select
                name="type"
                value={pet.type || "DOG"}
                label="Type"
                onChange={handleSelectChange}
              >
                <MenuItem value="DOG">Dog</MenuItem>
                <MenuItem value="CAT">Cat</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <Autocomplete<Breed, false, false, true>
                options={breeds.filter((b) => b.species === pet.type)}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : option.name
                }
                value={breeds.find((b) => b.name === pet.breed) || null}
                onChange={(_, newValue) => {
                  if (typeof newValue === "string") {
                    setPet((prev) => ({ ...prev, breed: newValue }));
                  } else {
                    setPet((prev) => ({
                      ...prev,
                      breed: newValue?.name || null,
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Breed"
                    placeholder="Search breeds..."
                  />
                )}
                freeSolo
                onInputChange={(_, newInputValue) => {
                  if (
                    newInputValue &&
                    !breeds.find((b) => b.name === newInputValue)
                  ) {
                    setPet((prev) => ({ ...prev, breed: newInputValue }));
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                label="Color"
                name="color"
                value={pet.color || ""}
                onChange={handleTextChange}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                label="Weight (lbs)"
                name="weight"
                type="number"
                value={pet.weight || ""}
                onChange={handleTextChange}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                label="Birthdate"
                name="birthdate"
                type="date"
                value={pet.birthdate || ""}
                onChange={handleTextChange}
                InputLabelProps={{ shrink: true }}
              />
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                name="gender"
                value={pet.gender || ""}
                label="Gender"
                onChange={handleSelectChange}
              >
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
              </Select>
            </FormControl>

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <FormControl fullWidth>
                <TextField
                  label="Microchip Number"
                  name="microchipNumber"
                  value={pet.microchipNumber || ""}
                  onChange={handleTextChange}
                />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  label="Rabies Tag Number"
                  name="rabiesTagNumber"
                  value={pet.rabiesTagNumber || ""}
                  onChange={handleTextChange}
                />
              </FormControl>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={pet.isNeutered || false}
                  onChange={handleCheckboxChange}
                  name="isNeutered"
                />
              }
              label="Neutered/Spayed"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Owner Information
          </Typography>
          <Box sx={{ mb: 2 }}>
            {isNewPet ? (
              <Autocomplete
                options={customers}
                getOptionLabel={(option) =>
                  `${option.firstName} ${option.lastName}${
                    option.email ? ` (${option.email})` : ""
                  }`
                }
                value={customers.find((c) => c.id === pet.customerId) || null}
                onChange={(_, newValue) => {
                  setPet((prev) => ({
                    ...prev,
                    customerId: newValue?.id || "",
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Owner *"
                    placeholder="Search by name or email..."
                    required
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Owner
                </Typography>
                <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography variant="body1">
                    {petOwner
                      ? `${petOwner.firstName} ${petOwner.lastName}`
                      : "Loading owner information..."}
                  </Typography>
                  {petOwner?.email && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {petOwner.email}
                    </Typography>
                  )}
                  {petOwner?.phone && (
                    <Typography variant="body2" color="text.secondary">
                      {petOwner.phone}
                    </Typography>
                  )}
                </Paper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Owner cannot be changed after pet creation. To transfer
                  ownership, please contact support.
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Additional Information
          </Typography>

          {/* Pet Icons Selector */}
          <EmojiPetIconSelector
            selectedIcons={pet.petIcons || []}
            onChange={(icons) => setPet({ ...pet, petIcons: icons })}
          />

          <Box sx={{ display: "grid", gap: 2 }}>
            {/* Medical Information */}
            <Typography variant="h6" gutterBottom>
              Medical Information
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 2,
              }}
            >
              <FormControl fullWidth>
                <Autocomplete<Veterinarian, false, false, true>
                  options={vets}
                  loading={vets.length === 0}
                  getOptionLabel={(option) => {
                    if (typeof option === "string") return option;
                    return option.name || "";
                  }}
                  value={(() => {
                    // First try to find by veterinarianId (linked)
                    if (pet.veterinarianId) {
                      const foundVet = vets.find(
                        (v) => v.id === pet.veterinarianId
                      );
                      if (foundVet) return foundVet;
                    }
                    // Then try to match by vetName (legacy)
                    if (pet.vetName) {
                      const foundVet = vets.find((v) => v.name === pet.vetName);
                      if (foundVet) return foundVet;
                      // If not found in list, return the name as string for freeSolo
                      return pet.vetName;
                    }
                    return null;
                  })()}
                  onChange={(_, newValue) => {
                    if (typeof newValue === "string") {
                      // Free text entry - no veterinarian link
                      setPet((prev) => ({
                        ...prev,
                        vetName: newValue,
                        vetPhone: null,
                        veterinarianId: null,
                      }));
                    } else if (newValue) {
                      // Selected from list - save the link
                      setPet((prev) => ({
                        ...prev,
                        vetName: newValue.name,
                        vetPhone: newValue.phone || null,
                        veterinarianId: newValue.id,
                      }));
                    } else {
                      // Cleared
                      setPet((prev) => ({
                        ...prev,
                        vetName: null,
                        vetPhone: null,
                        veterinarianId: null,
                      }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Veterinarian"
                      placeholder="Type to search or enter custom name..."
                      helperText={
                        vets.length > 0
                          ? `${vets.length} veterinarians available`
                          : "Loading veterinarians..."
                      }
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        {option.phone && (
                          <Typography variant="caption" color="textSecondary">
                            {option.phone}
                            {option.city &&
                              option.state &&
                              ` • ${option.city}, ${option.state}`}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )}
                  freeSolo
                  filterOptions={(options, state) => {
                    // Limit to first 100 results for performance
                    const filtered = options.filter((option) =>
                      option.name
                        .toLowerCase()
                        .includes(state.inputValue.toLowerCase())
                    );
                    return filtered.slice(0, 100);
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof value === "string") return option.name === value;
                    return option.id === value.id;
                  }}
                />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  label="Veterinarian Phone"
                  name="vetPhone"
                  value={pet.vetPhone || ""}
                  onChange={handleTextChange}
                  helperText="Auto-filled when selecting from list"
                />
              </FormControl>
            </Box>

            {/* Emergency Contact Section */}
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Emergency Contact
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Contact person other than the owner (e.g., spouse, pet sitter,
                neighbor)
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Contact Name"
                  name="emergencyContactName"
                  value={pet.emergencyContactName || ""}
                  onChange={handleTextChange}
                  placeholder="John Smith"
                />
                <TextField
                  label="Contact Phone"
                  name="emergencyContactPhone"
                  value={pet.emergencyContactPhone || ""}
                  onChange={handleTextChange}
                  placeholder="(555) 123-4567"
                />
                <FormControl fullWidth>
                  <InputLabel>Relationship</InputLabel>
                  <Select
                    name="emergencyContactRelation"
                    value={pet.emergencyContactRelation || ""}
                    label="Relationship"
                    onChange={(e: SelectChangeEvent) =>
                      setPet((prev) => ({
                        ...prev,
                        emergencyContactRelation: e.target.value || null,
                      }))
                    }
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="Spouse">Spouse</MenuItem>
                    <MenuItem value="Partner">Partner</MenuItem>
                    <MenuItem value="Family Member">Family Member</MenuItem>
                    <MenuItem value="Pet Sitter">Pet Sitter</MenuItem>
                    <MenuItem value="Neighbor">Neighbor</MenuItem>
                    <MenuItem value="Friend">Friend</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Vaccination Status */}
            <Box sx={{ mt: 2 }}>
              <VaccinationStatus
                petType={pet.type || "DOG"}
                vaccinationStatus={mapVaccinationData(pet.vaccinationStatus)}
                vaccineExpirations={mapVaccinationExpirations(
                  pet.vaccineExpirations
                )}
                onVaccinationStatusChange={(key, value) => {
                  // Map back to lowercase when saving
                  const lowercaseKey = key.toLowerCase();
                  setPet(
                    (prev) =>
                      ({
                        ...prev,
                        vaccinationStatus: {
                          ...(prev.vaccinationStatus || {}),
                          [lowercaseKey]: value,
                        },
                      } as any)
                  );
                }}
                onVaccineExpirationChange={(key, value) => {
                  // Map back to lowercase when saving
                  const lowercaseKey = key.toLowerCase();
                  setPet((prev) => ({
                    ...prev,
                    vaccineExpirations: {
                      ...(prev.vaccineExpirations || {}),
                      [lowercaseKey]: value,
                    },
                  }));
                }}
              />
            </Box>

            {/* Temperament Section */}
            <Box sx={{ mt: 2 }}>
              <FormLabel component="legend">Temperament</FormLabel>
              <FormGroup row>
                {temperamentTypes.map((temp) => (
                  <FormControlLabel
                    key={temp.id}
                    control={
                      <Checkbox
                        checked={selectedTemperaments.includes(temp.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTemperaments((prev) => [
                              ...prev,
                              temp.name,
                            ]);
                          } else {
                            setSelectedTemperaments((prev) =>
                              prev.filter((t) => t !== temp.name)
                            );
                          }
                        }}
                      />
                    }
                    label={temp.name}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box sx={{ display: "grid", gap: 2 }}>
              <FormControl fullWidth>
                <TextField
                  label="Allergies"
                  name="allergies"
                  value={pet.allergies || ""}
                  onChange={handleTextChange}
                  multiline
                  rows={2}
                />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  label="Medication Notes"
                  name="medicationNotes"
                  value={pet.medicationNotes || ""}
                  onChange={handleTextChange}
                  multiline
                  rows={2}
                />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  label="Food Notes"
                  name="foodNotes"
                  value={pet.foodNotes || ""}
                  onChange={handleTextChange}
                  multiline
                  rows={2}
                />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  label="Special Needs"
                  name="specialNeeds"
                  value={pet.specialNeeds || ""}
                  onChange={handleTextChange}
                  multiline
                  rows={2}
                />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  label="Behavior Notes"
                  name="behaviorNotes"
                  value={pet.behaviorNotes || ""}
                  onChange={handleTextChange}
                  multiline
                  rows={2}
                />
              </FormControl>
            </Box>
          </Box>
        </Paper>

        {/* Compatibility Information from Gingr */}
        {!isNewPet && (pet as any).playgroupCompatibility && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Typography variant="h6">
                Compatibility & Special Requirements
              </Typography>
              <PlaygroupBadge
                compatibility={(pet as any).playgroupCompatibility}
                size="medium"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <CompatibilityFlags
              healthFlags={(pet as any).healthFlags}
              behaviorFlags={(pet as any).behaviorFlags}
              aggressionFlags={(pet as any).aggressionFlags}
              specialRequirements={(pet as any).specialRequirements}
            />

            {(pet as any).compatibilityNotes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Additional Notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(pet as any).compatibilityNotes}
                </Typography>
              </Box>
            )}

            {(pet as any).staffRequirements &&
              Object.keys((pet as any).staffRequirements).length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: "warning.light",
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    ⚠️ Staff Requirements
                  </Typography>
                  {(pet as any).staffRequirements.seniorStaffRequired && (
                    <Typography variant="body2">
                      • Requires senior staff supervision
                    </Typography>
                  )}
                  {(pet as any).staffRequirements.notes && (
                    <Typography variant="body2">
                      • {(pet as any).staffRequirements.notes}
                    </Typography>
                  )}
                </Box>
              )}
          </Paper>
        )}

        <Box
          sx={{
            mt: 3,
            display: "flex",
            gap: 2,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <CircularProgress size={24} />
              ) : isNewPet ? (
                "Create Pet"
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate("/pets")}
              disabled={saving}
            >
              Cancel
            </Button>
          </Box>

          {/* Deactivate Button - only show for existing active pets */}
          {!isNewPet && pet.isActive && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeactivateDialogOpen(true)}
              disabled={saving}
            >
              Deactivate Pet
            </Button>
          )}
        </Box>

        {/* Deactivation Dialog */}
        <Dialog
          open={deactivateDialogOpen}
          onClose={() => setDeactivateDialogOpen(false)}
        >
          <DialogTitle>Deactivate Pet</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Deactivating a pet will preserve all history but stop all
              communications regarding this pet. This is typically used when a
              pet has passed away or is no longer a client.
            </Typography>
            <TextField
              label="Date"
              type="date"
              value={deactivationDate}
              onChange={(e) => setDeactivationDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Reason (optional)"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Passed away, Moved away, No longer a client"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeactivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeactivate} color="error" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : "Deactivate"}
            </Button>
          </DialogActions>
        </Dialog>

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

export default PetDetails;
