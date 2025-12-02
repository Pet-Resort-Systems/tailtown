/**
 * Business Info Step
 *
 * Collects basic business information: name, address, contact, logo.
 */

import React, { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
} from "@mui/material";
import { PhotoCamera, ArrowForward } from "@mui/icons-material";
import { useSetupWizard } from "../SetupWizardContext";

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

export default function BusinessInfoStep() {
  const { state, setBusinessInfo, completeStep, nextStep } = useSetupWizard();
  const { businessInfo } = state;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setBusinessInfo({ [field]: e.target.value });
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBusinessInfo({ logo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!businessInfo.name.trim()) newErrors.name = "Business name is required";
    if (!businessInfo.address.trim()) newErrors.address = "Address is required";
    if (!businessInfo.city.trim()) newErrors.city = "City is required";
    if (!businessInfo.state) newErrors.state = "State is required";
    if (!businessInfo.zipCode.trim())
      newErrors.zipCode = "ZIP code is required";
    if (!businessInfo.phone.trim()) newErrors.phone = "Phone is required";
    if (!businessInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessInfo.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      completeStep("business-info");
      nextStep();
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Business Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Tell us about your pet care facility.
      </Typography>

      <Grid container spacing={3}>
        {/* Logo Upload */}
        <Grid
          item
          xs={12}
          sx={{ display: "flex", alignItems: "center", gap: 3 }}
        >
          <Avatar
            src={logoPreview || undefined}
            sx={{ width: 100, height: 100, bgcolor: "grey.200" }}
          >
            {!logoPreview && businessInfo.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="logo-upload"
              type="file"
              onChange={handleLogoChange}
            />
            <label htmlFor="logo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoCamera />}
              >
                Upload Logo
              </Button>
            </label>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Recommended: 200x200px, PNG or JPG
            </Typography>
          </Box>
        </Grid>

        {/* Business Name */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Business Name"
            value={businessInfo.name}
            onChange={handleChange("name")}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
        </Grid>

        {/* Legal Name (optional) */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Legal Business Name"
            value={businessInfo.legalName || ""}
            onChange={handleChange("legalName")}
            helperText="If different from business name"
          />
        </Grid>

        {/* Address */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Street Address"
            value={businessInfo.address}
            onChange={handleChange("address")}
            error={!!errors.address}
            helperText={errors.address}
            required
          />
        </Grid>

        {/* City, State, ZIP */}
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            label="City"
            value={businessInfo.city}
            onChange={handleChange("city")}
            error={!!errors.city}
            helperText={errors.city}
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth error={!!errors.state} required>
            <InputLabel>State</InputLabel>
            <Select
              value={businessInfo.state}
              label="State"
              onChange={(e) => setBusinessInfo({ state: e.target.value })}
            >
              {US_STATES.map((state) => (
                <MenuItem key={state} value={state}>
                  {state}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="ZIP Code"
            value={businessInfo.zipCode}
            onChange={handleChange("zipCode")}
            error={!!errors.zipCode}
            helperText={errors.zipCode}
            required
          />
        </Grid>

        {/* Phone & Email */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={businessInfo.phone}
            onChange={handleChange("phone")}
            error={!!errors.phone}
            helperText={errors.phone}
            placeholder="(555) 123-4567"
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={businessInfo.email}
            onChange={handleChange("email")}
            error={!!errors.email}
            helperText={errors.email}
            required
          />
        </Grid>

        {/* Website (optional) */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Website"
            value={businessInfo.website || ""}
            onChange={handleChange("website")}
            placeholder="https://www.example.com"
          />
        </Grid>

        {/* Timezone */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Timezone</InputLabel>
            <Select
              value={businessInfo.timezone}
              label="Timezone"
              onChange={(e) => setBusinessInfo({ timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <MenuItem key={tz.value} value={tz.value}>
                  {tz.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleNext}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
