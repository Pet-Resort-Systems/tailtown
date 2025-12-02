/**
 * Pricing Step
 *
 * Configure rates, discounts, deposits, and surcharges.
 */

import React from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Slider,
} from "@mui/material";
import { ArrowForward, ArrowBack } from "@mui/icons-material";
import { useSetupWizard } from "../SetupWizardContext";
import { KennelSize, DEFAULT_KENNEL_SIZES } from "../types";

export default function PricingStep() {
  const { state, setPricing, completeStep, nextStep, prevStep } =
    useSetupWizard();
  const { pricing } = state;

  const updateTierRate = (
    size: KennelSize,
    field: "dailyRate" | "halfDayRate",
    value: number
  ) => {
    const updatedTiers = pricing.tiers.map((tier) =>
      tier.kennelSize === size ? { ...tier, [field]: value } : tier
    );
    setPricing({ tiers: updatedTiers });
  };

  const handleNext = () => {
    completeStep("pricing");
    nextStep();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Pricing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Set your rates for each kennel size. You can adjust these anytime.
      </Typography>

      {/* Daily Rates by Size */}
      <Typography variant="h6" gutterBottom>
        Daily Rates
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {pricing.tiers.map((tier) => {
          const sizeConfig = DEFAULT_KENNEL_SIZES.find(
            (s) => s.size === tier.kennelSize
          );
          return (
            <Grid item xs={12} sm={6} md={4} key={tier.kennelSize}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {sizeConfig?.label} (up to {sizeConfig?.maxWeight} lbs)
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Daily"
                        type="number"
                        value={tier.dailyRate}
                        onChange={(e) =>
                          updateTierRate(
                            tier.kennelSize,
                            "dailyRate",
                            Number(e.target.value)
                          )
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                        }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Half Day"
                        type="number"
                        value={tier.halfDayRate || ""}
                        onChange={(e) =>
                          updateTierRate(
                            tier.kennelSize,
                            "halfDayRate",
                            Number(e.target.value)
                          )
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                        }}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Discounts & Surcharges */}
      <Typography variant="h6" gutterBottom>
        Discounts & Surcharges
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Holiday Surcharge
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={pricing.holidaySurcharge}
                  onChange={(_, value) =>
                    setPricing({ holidaySurcharge: value as number })
                  }
                  min={0}
                  max={50}
                  marks={[
                    { value: 0, label: "0%" },
                    { value: 25, label: "25%" },
                    { value: 50, label: "50%" },
                  ]}
                  valueLabelDisplay="on"
                  valueLabelFormat={(v) => `${v}%`}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Multi-Pet Discount
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={pricing.multiPetDiscount}
                  onChange={(_, value) =>
                    setPricing({ multiPetDiscount: value as number })
                  }
                  min={0}
                  max={30}
                  marks={[
                    { value: 0, label: "0%" },
                    { value: 15, label: "15%" },
                    { value: 30, label: "30%" },
                  ]}
                  valueLabelDisplay="on"
                  valueLabelFormat={(v) => `${v}%`}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Deposit Settings */}
      <Typography variant="h6" gutterBottom>
        Deposit Requirements
      </Typography>
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={pricing.depositRequired}
                onChange={(e) =>
                  setPricing({ depositRequired: e.target.checked })
                }
              />
            }
            label="Require deposit for reservations"
          />
          {pricing.depositRequired && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Deposit Type</InputLabel>
                  <Select
                    value={pricing.depositType}
                    label="Deposit Type"
                    onChange={(e) =>
                      setPricing({
                        depositType: e.target.value as
                          | "fixed"
                          | "percentage"
                          | "first_night",
                      })
                    }
                  >
                    <MenuItem value="first_night">First Night's Stay</MenuItem>
                    <MenuItem value="percentage">Percentage of Total</MenuItem>
                    <MenuItem value="fixed">Fixed Amount</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {pricing.depositType !== "first_night" && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={
                      pricing.depositType === "percentage"
                        ? "Percentage"
                        : "Amount"
                    }
                    type="number"
                    value={pricing.depositAmount || ""}
                    onChange={(e) =>
                      setPricing({ depositAmount: Number(e.target.value) })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {pricing.depositType === "percentage" ? "%" : "$"}
                        </InputAdornment>
                      ),
                    }}
                    size="small"
                  />
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={prevStep}>
          Back
        </Button>
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
