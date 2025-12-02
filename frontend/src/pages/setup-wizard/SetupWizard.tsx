/**
 * Setup Wizard - Main Component
 *
 * Multi-step onboarding wizard for new tenants.
 */

import React from "react";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Paper,
  Typography,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Business,
  MeetingRoom,
  Pets,
  AttachMoney,
  Schedule,
  People,
  CreditCard,
  Notifications,
  Palette,
  Policy,
  CheckCircle,
} from "@mui/icons-material";
import { useSetupWizard } from "./SetupWizardContext";
import { WIZARD_STEPS, WizardStep } from "./types";

// Step Components
import BusinessInfoStep from "./steps/BusinessInfoStep";
import RoomsKennelsStep from "./steps/RoomsKennelsStep";
import ServicesStep from "./steps/ServicesStep";
import PricingStep from "./steps/PricingStep";
import OperatingHoursStep from "./steps/OperatingHoursStep";
import StaffStep from "./steps/StaffStep";
import PaymentStep from "./steps/PaymentStep";
import NotificationsStep from "./steps/NotificationsStep";
import BrandingStep from "./steps/BrandingStep";
import PoliciesStep from "./steps/PoliciesStep";
import ReviewStep from "./steps/ReviewStep";

// Icon mapping
const STEP_ICONS: Record<string, React.ReactNode> = {
  Business: <Business />,
  MeetingRoom: <MeetingRoom />,
  Pets: <Pets />,
  AttachMoney: <AttachMoney />,
  Schedule: <Schedule />,
  People: <People />,
  CreditCard: <CreditCard />,
  Notifications: <Notifications />,
  Palette: <Palette />,
  Policy: <Policy />,
  CheckCircle: <CheckCircle />,
};

// Step component mapping
const STEP_COMPONENTS: Record<WizardStep, React.ComponentType> = {
  "business-info": BusinessInfoStep,
  "rooms-kennels": RoomsKennelsStep,
  services: ServicesStep,
  pricing: PricingStep,
  "operating-hours": OperatingHoursStep,
  staff: StaffStep,
  payment: PaymentStep,
  notifications: NotificationsStep,
  branding: BrandingStep,
  policies: PoliciesStep,
  review: ReviewStep,
};

export default function SetupWizard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { state, goToStep, isStepComplete, getProgress } = useSetupWizard();

  const currentStepIndex = WIZARD_STEPS.findIndex(
    (s) => s.id === state.currentStep
  );
  const CurrentStepComponent = STEP_COMPONENTS[state.currentStep];

  const handleStepClick = (step: WizardStep) => {
    // Allow clicking on completed steps or the next available step
    const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === step);
    const canNavigate =
      stepIndex <= currentStepIndex ||
      isStepComplete(WIZARD_STEPS[stepIndex - 1]?.id);
    if (canNavigate) {
      goToStep(step);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2 }}>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome to Tailtown
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Let's set up your facility. This will take about 10-15 minutes.
          </Typography>
          <Box sx={{ mt: 2, maxWidth: 400, mx: "auto" }}>
            <LinearProgress
              variant="determinate"
              value={getProgress()}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              {getProgress()}% complete
            </Typography>
          </Box>
        </Box>

        {/* Stepper - Horizontal on desktop, hidden on mobile */}
        {!isMobile && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stepper activeStep={currentStepIndex} alternativeLabel nonLinear>
              {WIZARD_STEPS.map((step) => {
                const isComplete = isStepComplete(step.id);
                const isCurrent = step.id === state.currentStep;

                return (
                  <Step key={step.id} completed={isComplete}>
                    <StepButton
                      onClick={() => handleStepClick(step.id)}
                      icon={
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: isComplete
                              ? "success.main"
                              : isCurrent
                              ? "primary.main"
                              : "grey.300",
                            color:
                              isComplete || isCurrent ? "white" : "grey.600",
                          }}
                        >
                          {isComplete ? (
                            <CheckCircle fontSize="small" />
                          ) : (
                            STEP_ICONS[step.icon]
                          )}
                        </Box>
                      }
                    >
                      <StepLabel
                        optional={
                          !step.required && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Optional
                            </Typography>
                          )
                        }
                      >
                        {step.title}
                      </StepLabel>
                    </StepButton>
                  </Step>
                );
              })}
            </Stepper>
          </Paper>
        )}

        {/* Mobile Step Indicator */}
        {isMobile && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "primary.main",
                  color: "white",
                }}
              >
                {STEP_ICONS[WIZARD_STEPS[currentStepIndex].icon]}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
                </Typography>
                <Typography variant="h6">
                  {WIZARD_STEPS[currentStepIndex].title}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Current Step Content */}
        <Paper sx={{ p: { xs: 2, md: 4 } }}>
          <CurrentStepComponent />
        </Paper>
      </Box>
    </Box>
  );
}
