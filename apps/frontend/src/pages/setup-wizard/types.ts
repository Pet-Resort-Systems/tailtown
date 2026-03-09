/**
 * Setup Wizard Types
 */

// ============================================================================
// Step Definitions
// ============================================================================

export type WizardStep =
  | "business-info"
  | "rooms-kennels"
  | "services"
  | "pricing"
  | "operating-hours"
  | "staff"
  | "payment"
  | "notifications"
  | "branding"
  | "policies"
  | "review";

export interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
  icon: string;
  required: boolean;
}

export const WIZARD_STEPS: StepConfig[] = [
  {
    id: "business-info",
    title: "Business Info",
    description: "Name, address, contact details",
    icon: "Business",
    required: true,
  },
  {
    id: "rooms-kennels",
    title: "Rooms & Kennels",
    description: "Configure your facility layout",
    icon: "MeetingRoom",
    required: true,
  },
  {
    id: "services",
    title: "Services",
    description: "Boarding, daycare, grooming, etc.",
    icon: "Pets",
    required: true,
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Rates, discounts, surcharges",
    icon: "AttachMoney",
    required: true,
  },
  {
    id: "operating-hours",
    title: "Hours",
    description: "Business hours & holidays",
    icon: "Schedule",
    required: true,
  },
  {
    id: "staff",
    title: "Staff",
    description: "Team members & roles",
    icon: "People",
    required: true,
  },
  {
    id: "payment",
    title: "Payment",
    description: "CardConnect merchant setup",
    icon: "CreditCard",
    required: true,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Email & SMS settings",
    icon: "Notifications",
    required: false,
  },
  {
    id: "branding",
    title: "Branding",
    description: "Colors & customization",
    icon: "Palette",
    required: false,
  },
  {
    id: "policies",
    title: "Policies",
    description: "Cancellation, vaccinations, etc.",
    icon: "Policy",
    required: false,
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm and launch",
    icon: "CheckCircle",
    required: true,
  },
];

// ============================================================================
// Business Info
// ============================================================================

export interface BusinessInfo {
  name: string;
  legalName?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: File | string;
  timezone: string;
}

// ============================================================================
// Rooms & Kennels
// ============================================================================

export type KennelSize = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE" | "SUITE";

export interface KennelSizeConfig {
  size: KennelSize;
  label: string;
  maxWeight: number; // lbs
  dimensions?: string; // e.g., "3x4 ft"
}

export interface RoomConfig {
  id: string;
  name: string;
  kennels: KennelConfig[];
}

export interface KennelConfig {
  id: string;
  name: string;
  size: KennelSize;
  capacity: number; // number of pets (for shared rooms)
}

export interface RoomsKennelsData {
  rooms: RoomConfig[];
  namingConvention: "numeric" | "alpha" | "custom";
  kennelSizes: KennelSizeConfig[];
}

// ============================================================================
// Services
// ============================================================================

export type ServiceCategory =
  | "BOARDING"
  | "DAYCARE"
  | "GROOMING"
  | "TRAINING"
  | "WALKING"
  | "BATHING"
  | "ADDON";

export interface ServiceConfig {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  duration?: number; // minutes
  enabled: boolean;
}

export interface ServicesData {
  services: ServiceConfig[];
  enableGrooming: boolean;
  enableTraining: boolean;
  enableDaycare: boolean;
}

// ============================================================================
// Pricing
// ============================================================================

export interface PricingTier {
  kennelSize: KennelSize;
  dailyRate: number;
  halfDayRate?: number;
}

export interface PricingData {
  tiers: PricingTier[];
  holidaySurcharge: number; // percentage
  multiPetDiscount: number; // percentage
  extendedStayDiscount?: {
    daysThreshold: number;
    discountPercent: number;
  };
  depositRequired: boolean;
  depositAmount?: number; // fixed amount or percentage
  depositType: "fixed" | "percentage" | "first_night";
}

// ============================================================================
// Operating Hours
// ============================================================================

export interface DayHours {
  open: string; // HH:MM
  close: string; // HH:MM
  closed: boolean;
}

export interface HolidayConfig {
  date: string; // YYYY-MM-DD or recurring like "12-25"
  name: string;
  closed: boolean;
  surchargeApplies: boolean;
}

export interface OperatingHoursData {
  hours: {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
  };
  checkInWindow: { start: string; end: string };
  checkOutWindow: { start: string; end: string };
  holidays: HolidayConfig[];
}

// ============================================================================
// Staff
// ============================================================================

export type StaffRole = "ADMIN" | "MANAGER" | "STAFF" | "GROOMER" | "TRAINER";

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: StaffRole;
  isOwner: boolean;
}

export interface StaffData {
  members: StaffMember[];
}

// ============================================================================
// Payment (CardConnect)
// ============================================================================

export interface PaymentData {
  cardConnect: {
    merchantId: string;
    apiUsername: string;
    apiPassword: string;
    testMode: boolean;
  };
  acceptedCards: ("visa" | "mastercard" | "amex" | "discover")[];
  requireCvv: boolean;
  storeCards: boolean; // for recurring charges
}

// ============================================================================
// Notifications
// ============================================================================

export interface NotificationsData {
  sendGrid?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  enableEmailConfirmations: boolean;
  enableSmsReminders: boolean;
  reminderDaysBefore: number;
}

// ============================================================================
// Branding
// ============================================================================

export interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
}

// ============================================================================
// Policies
// ============================================================================

export interface PoliciesData {
  cancellation: {
    hoursNotice: number;
    feePercent: number;
    noShowFeePercent: number;
  };
  vaccinations: {
    required: string[]; // e.g., ['Rabies', 'Bordetella', 'DHPP']
    requireProof: boolean;
    expirationWarningDays: number;
  };
  breedRestrictions: {
    enabled: boolean;
    restrictedBreeds: string[];
    message?: string;
  };
  ageRestrictions: {
    minimumAge: number; // months
    seniorAge?: number; // years, for special handling
  };
  spayNeuterRequired: boolean;
  temperamentTestRequired: boolean;
}

// ============================================================================
// Complete Wizard Data
// ============================================================================

export interface SetupWizardData {
  businessInfo: BusinessInfo;
  roomsKennels: RoomsKennelsData;
  services: ServicesData;
  pricing: PricingData;
  operatingHours: OperatingHoursData;
  staff: StaffData;
  payment: PaymentData;
  notifications: NotificationsData;
  branding: BrandingData;
  policies: PoliciesData;
  completedSteps: WizardStep[];
  currentStep: WizardStep;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_KENNEL_SIZES: KennelSizeConfig[] = [
  { size: "SMALL", label: "Small", maxWeight: 25 },
  { size: "MEDIUM", label: "Medium", maxWeight: 50 },
  { size: "LARGE", label: "Large", maxWeight: 80 },
  { size: "XLARGE", label: "Extra Large", maxWeight: 120 },
  { size: "SUITE", label: "Suite", maxWeight: 200 },
];

export const DEFAULT_SERVICES: ServiceConfig[] = [
  { id: "boarding", name: "Boarding", category: "BOARDING", enabled: true },
  { id: "daycare", name: "Day Camp", category: "DAYCARE", enabled: true },
  {
    id: "grooming-full",
    name: "Full Groom",
    category: "GROOMING",
    duration: 120,
    enabled: false,
  },
  {
    id: "grooming-bath",
    name: "Bath & Brush",
    category: "BATHING",
    duration: 60,
    enabled: false,
  },
  {
    id: "training-basic",
    name: "Basic Training",
    category: "TRAINING",
    duration: 60,
    enabled: false,
  },
  {
    id: "walking",
    name: "Dog Walking",
    category: "WALKING",
    duration: 30,
    enabled: false,
  },
];

export const DEFAULT_VACCINATIONS = [
  "Rabies",
  "Bordetella",
  "DHPP (Distemper)",
  "Canine Influenza",
];

export const DEFAULT_HOURS: DayHours = {
  open: "07:00",
  close: "19:00",
  closed: false,
};

export const DEFAULT_HOLIDAYS: HolidayConfig[] = [
  {
    date: "01-01",
    name: "New Year's Day",
    closed: false,
    surchargeApplies: true,
  },
  {
    date: "07-04",
    name: "Independence Day",
    closed: false,
    surchargeApplies: true,
  },
  {
    date: "11-28",
    name: "Thanksgiving",
    closed: true,
    surchargeApplies: false,
  },
  {
    date: "12-25",
    name: "Christmas Day",
    closed: true,
    surchargeApplies: false,
  },
];
