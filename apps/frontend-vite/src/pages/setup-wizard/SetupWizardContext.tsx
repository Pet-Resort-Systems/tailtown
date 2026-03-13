/**
 * Setup Wizard Context
 *
 * Manages state across all wizard steps with persistence.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import {
  SetupWizardData,
  WizardStep,
  WIZARD_STEPS,
  BusinessInfo,
  RoomsKennelsData,
  ServicesData,
  PricingData,
  OperatingHoursData,
  StaffData,
  PaymentData,
  NotificationsData,
  BrandingData,
  PoliciesData,
  DEFAULT_KENNEL_SIZES,
  DEFAULT_SERVICES,
  DEFAULT_HOURS,
  DEFAULT_HOLIDAYS,
  DEFAULT_VACCINATIONS,
} from "./types";

// ============================================================================
// Initial State
// ============================================================================

const getInitialState = (): SetupWizardData => ({
  businessInfo: {
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    timezone: "America/Denver",
  },
  roomsKennels: {
    rooms: [],
    namingConvention: "numeric",
    kennelSizes: DEFAULT_KENNEL_SIZES,
  },
  services: {
    services: DEFAULT_SERVICES,
    enableGrooming: false,
    enableTraining: false,
    enableDaycare: true,
  },
  pricing: {
    tiers: [
      { kennelSize: "SMALL", dailyRate: 35, halfDayRate: 20 },
      { kennelSize: "MEDIUM", dailyRate: 40, halfDayRate: 25 },
      { kennelSize: "LARGE", dailyRate: 45, halfDayRate: 28 },
      { kennelSize: "XLARGE", dailyRate: 50, halfDayRate: 30 },
      { kennelSize: "SUITE", dailyRate: 65, halfDayRate: 40 },
    ],
    holidaySurcharge: 15,
    multiPetDiscount: 10,
    depositRequired: true,
    depositType: "first_night",
  },
  operatingHours: {
    hours: {
      monday: { ...DEFAULT_HOURS },
      tuesday: { ...DEFAULT_HOURS },
      wednesday: { ...DEFAULT_HOURS },
      thursday: { ...DEFAULT_HOURS },
      friday: { ...DEFAULT_HOURS },
      saturday: { open: "08:00", close: "17:00", closed: false },
      sunday: { open: "08:00", close: "17:00", closed: false },
    },
    checkInWindow: { start: "14:00", end: "18:00" },
    checkOutWindow: { start: "07:00", end: "12:00" },
    holidays: DEFAULT_HOLIDAYS,
  },
  staff: {
    members: [],
  },
  payment: {
    cardConnect: {
      merchantId: "",
      apiUsername: "",
      apiPassword: "",
      testMode: true,
    },
    acceptedCards: ["visa", "mastercard", "amex", "discover"],
    requireCvv: true,
    storeCards: true,
  },
  notifications: {
    enableEmailConfirmations: true,
    enableSmsReminders: false,
    reminderDaysBefore: 1,
  },
  branding: {
    primaryColor: "#1976d2",
    secondaryColor: "#dc004e",
  },
  policies: {
    cancellation: {
      hoursNotice: 48,
      feePercent: 50,
      noShowFeePercent: 100,
    },
    vaccinations: {
      required: DEFAULT_VACCINATIONS,
      requireProof: true,
      expirationWarningDays: 30,
    },
    breedRestrictions: {
      enabled: false,
      restrictedBreeds: [],
    },
    ageRestrictions: {
      minimumAge: 4,
    },
    spayNeuterRequired: false,
    temperamentTestRequired: true,
  },
  completedSteps: [],
  currentStep: "business-info",
});

// ============================================================================
// Actions
// ============================================================================

type Action =
  | { type: "SET_BUSINESS_INFO"; payload: Partial<BusinessInfo> }
  | { type: "SET_ROOMS_KENNELS"; payload: Partial<RoomsKennelsData> }
  | { type: "SET_SERVICES"; payload: Partial<ServicesData> }
  | { type: "SET_PRICING"; payload: Partial<PricingData> }
  | { type: "SET_OPERATING_HOURS"; payload: Partial<OperatingHoursData> }
  | { type: "SET_STAFF"; payload: Partial<StaffData> }
  | { type: "SET_PAYMENT"; payload: Partial<PaymentData> }
  | { type: "SET_NOTIFICATIONS"; payload: Partial<NotificationsData> }
  | { type: "SET_BRANDING"; payload: Partial<BrandingData> }
  | { type: "SET_POLICIES"; payload: Partial<PoliciesData> }
  | { type: "COMPLETE_STEP"; payload: WizardStep }
  | { type: "GO_TO_STEP"; payload: WizardStep }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "RESET" }
  | { type: "LOAD_STATE"; payload: SetupWizardData };

function reducer(state: SetupWizardData, action: Action): SetupWizardData {
  switch (action.type) {
    case "SET_BUSINESS_INFO":
      return {
        ...state,
        businessInfo: { ...state.businessInfo, ...action.payload },
      };
    case "SET_ROOMS_KENNELS":
      return {
        ...state,
        roomsKennels: { ...state.roomsKennels, ...action.payload },
      };
    case "SET_SERVICES":
      return { ...state, services: { ...state.services, ...action.payload } };
    case "SET_PRICING":
      return { ...state, pricing: { ...state.pricing, ...action.payload } };
    case "SET_OPERATING_HOURS":
      return {
        ...state,
        operatingHours: { ...state.operatingHours, ...action.payload },
      };
    case "SET_STAFF":
      return { ...state, staff: { ...state.staff, ...action.payload } };
    case "SET_PAYMENT":
      return { ...state, payment: { ...state.payment, ...action.payload } };
    case "SET_NOTIFICATIONS":
      return {
        ...state,
        notifications: { ...state.notifications, ...action.payload },
      };
    case "SET_BRANDING":
      return { ...state, branding: { ...state.branding, ...action.payload } };
    case "SET_POLICIES":
      return { ...state, policies: { ...state.policies, ...action.payload } };
    case "COMPLETE_STEP":
      return {
        ...state,
        completedSteps: state.completedSteps.includes(action.payload)
          ? state.completedSteps
          : [...state.completedSteps, action.payload],
      };
    case "GO_TO_STEP":
      return { ...state, currentStep: action.payload };
    case "NEXT_STEP": {
      const currentIndex = WIZARD_STEPS.findIndex(
        (s) => s.id === state.currentStep
      );
      const nextStep = WIZARD_STEPS[currentIndex + 1];
      return nextStep ? { ...state, currentStep: nextStep.id } : state;
    }
    case "PREV_STEP": {
      const currentIndex = WIZARD_STEPS.findIndex(
        (s) => s.id === state.currentStep
      );
      const prevStep = WIZARD_STEPS[currentIndex - 1];
      return prevStep ? { ...state, currentStep: prevStep.id } : state;
    }
    case "RESET":
      return getInitialState();
    case "LOAD_STATE":
      return action.payload;
    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface SetupWizardContextType {
  state: SetupWizardData;
  dispatch: React.Dispatch<Action>;
  // Convenience methods
  setBusinessInfo: (data: Partial<BusinessInfo>) => void;
  setRoomsKennels: (data: Partial<RoomsKennelsData>) => void;
  setServices: (data: Partial<ServicesData>) => void;
  setPricing: (data: Partial<PricingData>) => void;
  setOperatingHours: (data: Partial<OperatingHoursData>) => void;
  setStaff: (data: Partial<StaffData>) => void;
  setPayment: (data: Partial<PaymentData>) => void;
  setNotifications: (data: Partial<NotificationsData>) => void;
  setBranding: (data: Partial<BrandingData>) => void;
  setPolicies: (data: Partial<PoliciesData>) => void;
  completeStep: (step: WizardStep) => void;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  isStepComplete: (step: WizardStep) => boolean;
  canProceed: () => boolean;
  getProgress: () => number;
}

const SetupWizardContext = createContext<SetupWizardContextType | null>(null);

const STORAGE_KEY = "tailtown_setup_wizard";

// ============================================================================
// Provider
// ============================================================================

interface SetupWizardProviderProps {
  children: ReactNode;
}

export default function SetupWizardProvider({
  children,
}: SetupWizardProviderProps) {
  const [state, dispatch] = useReducer(reducer, getInitialState());

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: "LOAD_STATE", payload: parsed });
      } catch (e) {
        console.error("Failed to load setup wizard state:", e);
      }
    }
  }, []);

  // Save state on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value: SetupWizardContextType = {
    state,
    dispatch,
    setBusinessInfo: (data) =>
      dispatch({ type: "SET_BUSINESS_INFO", payload: data }),
    setRoomsKennels: (data) =>
      dispatch({ type: "SET_ROOMS_KENNELS", payload: data }),
    setServices: (data) => dispatch({ type: "SET_SERVICES", payload: data }),
    setPricing: (data) => dispatch({ type: "SET_PRICING", payload: data }),
    setOperatingHours: (data) =>
      dispatch({ type: "SET_OPERATING_HOURS", payload: data }),
    setStaff: (data) => dispatch({ type: "SET_STAFF", payload: data }),
    setPayment: (data) => dispatch({ type: "SET_PAYMENT", payload: data }),
    setNotifications: (data) =>
      dispatch({ type: "SET_NOTIFICATIONS", payload: data }),
    setBranding: (data) => dispatch({ type: "SET_BRANDING", payload: data }),
    setPolicies: (data) => dispatch({ type: "SET_POLICIES", payload: data }),
    completeStep: (step) => dispatch({ type: "COMPLETE_STEP", payload: step }),
    goToStep: (step) => dispatch({ type: "GO_TO_STEP", payload: step }),
    nextStep: () => dispatch({ type: "NEXT_STEP" }),
    prevStep: () => dispatch({ type: "PREV_STEP" }),
    reset: () => {
      localStorage.removeItem(STORAGE_KEY);
      dispatch({ type: "RESET" });
    },
    isStepComplete: (step) => state.completedSteps.includes(step),
    canProceed: () => {
      const currentStepConfig = WIZARD_STEPS.find(
        (s) => s.id === state.currentStep
      );
      if (!currentStepConfig?.required) return true;
      return state.completedSteps.includes(state.currentStep);
    },
    getProgress: () => {
      const requiredSteps = WIZARD_STEPS.filter((s) => s.required);
      const completedRequired = requiredSteps.filter((s) =>
        state.completedSteps.includes(s.id)
      );
      return Math.round(
        (completedRequired.length / requiredSteps.length) * 100
      );
    },
  };

  return (
    <SetupWizardContext.Provider value={value}>
      {children}
    </SetupWizardContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useSetupWizard() {
  const context = useContext(SetupWizardContext);
  if (!context) {
    throw new Error("useSetupWizard must be used within SetupWizardProvider");
  }
  return context;
}
