import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";

// Onboarding steps
export type OnboardingStep =
  | "welcome"
  | "dashboard"
  | "create-reservation"
  | "check-in"
  | "check-out"
  | "complete";

interface OnboardingState {
  isActive: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  hasCompletedOnboarding: boolean;
}

interface OnboardingContextType {
  state: OnboardingState;
  startOnboarding: () => void;
  skipOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const ONBOARDING_STORAGE_KEY = "tailtown_staff_onboarding";

const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "dashboard",
  "create-reservation",
  "check-in",
  "check-out",
  "complete",
];

const defaultState: OnboardingState = {
  isActive: false,
  currentStep: "welcome",
  completedSteps: [],
  hasCompletedOnboarding: false,
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const getTenantKey = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  return (
    (parts.length >= 3 ? parts[0] : undefined) ||
    localStorage.getItem("tailtown_tenant_id") ||
    "dev"
  );
};

const getOnboardingStorageKey = (email: string) => {
  const tenantKey = getTenantKey();
  return `${ONBOARDING_STORAGE_KEY}_${tenantKey}_${email.toLowerCase()}`;
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(defaultState);
  const userId = user?.id;
  const userEmail = user?.email;

  // Load onboarding state from localStorage
  useEffect(() => {
    if (userId && userEmail) {
      const storageKey = getOnboardingStorageKey(userEmail);
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setState(parsed);
        } catch (e) {
          console.error("Failed to parse onboarding state:", e);
        }
      } else {
        const legacyKey = `${ONBOARDING_STORAGE_KEY}_${userId}`;
        const legacyStored = localStorage.getItem(legacyKey);

        if (legacyStored) {
          try {
            const parsed = JSON.parse(legacyStored);
            localStorage.setItem(storageKey, JSON.stringify(parsed));
            setState(parsed);
          } catch (e) {
            console.error("Failed to parse onboarding state:", e);
          }
        } else {
          // First time user - show onboarding prompt
          setState({
            ...defaultState,
            isActive: true, // Auto-start for new users
          });
        }
      }
    }
  }, [userEmail, userId]);

  // Save state to localStorage
  const saveState = useCallback(
    (newState: OnboardingState) => {
      if (userId && userEmail) {
        const storageKey = getOnboardingStorageKey(userEmail);
        localStorage.setItem(storageKey, JSON.stringify(newState));
      }
      setState(newState);
    },
    [userEmail, userId]
  );

  const startOnboarding = useCallback(() => {
    saveState({
      ...state,
      isActive: true,
      currentStep: "welcome",
      completedSteps: [],
    });
  }, [state, saveState]);

  const skipOnboarding = useCallback(() => {
    saveState({
      ...state,
      isActive: false,
      hasCompletedOnboarding: true,
    });
  }, [state, saveState]);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStepValue = STEP_ORDER[currentIndex + 1];
      saveState({
        ...state,
        currentStep: nextStepValue,
        completedSteps: [...state.completedSteps, state.currentStep],
      });
    }
  }, [state, saveState]);

  const previousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0) {
      saveState({
        ...state,
        currentStep: STEP_ORDER[currentIndex - 1],
      });
    }
  }, [state, saveState]);

  const goToStep = useCallback(
    (step: OnboardingStep) => {
      saveState({
        ...state,
        currentStep: step,
      });
    },
    [state, saveState]
  );

  const completeOnboarding = useCallback(() => {
    saveState({
      ...state,
      isActive: false,
      hasCompletedOnboarding: true,
      completedSteps: STEP_ORDER,
    });
  }, [state, saveState]);

  const resetOnboarding = useCallback(() => {
    if (userId && userEmail) {
      const storageKey = getOnboardingStorageKey(userEmail);
      const legacyKey = `${ONBOARDING_STORAGE_KEY}_${userId}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(legacyKey);
    }
    setState(defaultState);
  }, [userEmail, userId]);

  return (
    <OnboardingContext.Provider
      value={{
        state,
        startOnboarding,
        skipOnboarding,
        nextStep,
        previousStep,
        goToStep,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;
