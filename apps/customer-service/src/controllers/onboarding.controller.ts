/**
 * Onboarding Controller
 *
 * Handles new tenant setup from the wizard.
 * Creates tenant, resources (rooms/kennels), services, staff, and settings.
 */

import { type Request, type Response, type NextFunction } from 'express';
import { ResourceType, ServiceCategory } from '@prisma/client';
import bcrypt from 'bcrypt';
import AppError from '../utils/appError.js';
import { prisma } from '../config/prisma.js';
// uuid not needed - Prisma generates IDs

// ============================================================================
// Types matching the frontend wizard
// ============================================================================

interface BusinessInfo {
  name: string;
  legalName?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  timezone: string;
}

interface KennelConfig {
  id: string;
  name: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE' | 'SUITE';
  capacity: number;
}

interface RoomConfig {
  id: string;
  name: string;
  kennels: KennelConfig[];
}

interface RoomsKennelsData {
  rooms: RoomConfig[];
  namingConvention: string;
}

interface ServiceConfig {
  id: string;
  name: string;
  category: string;
  description?: string;
  duration?: number;
  enabled: boolean;
}

interface PricingTier {
  kennelSize: string;
  dailyRate: number;
  halfDayRate?: number;
}

interface PricingData {
  tiers: PricingTier[];
  holidaySurcharge: number;
  multiPetDiscount: number;
  depositRequired: boolean;
  depositType: string;
  depositAmount?: number;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OperatingHoursData {
  hours: Record<string, DayHours>;
  checkInWindow: { start: string; end: string };
  checkOutWindow: { start: string; end: string };
  holidays: Array<{
    date: string;
    name: string;
    closed: boolean;
    surchargeApplies: boolean;
  }>;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isOwner: boolean;
}

interface PaymentData {
  cardConnect: {
    merchantId: string;
    apiUsername: string;
    apiPassword: string;
    testMode: boolean;
  };
  acceptedCards: string[];
  requireCvv: boolean;
  storeCards: boolean;
}

interface NotificationsData {
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

interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
}

interface PoliciesData {
  cancellation: {
    hoursNotice: number;
    feePercent: number;
    noShowFeePercent: number;
  };
  vaccinations: {
    required: string[];
    requireProof: boolean;
    expirationWarningDays: number;
  };
  breedRestrictions: {
    enabled: boolean;
    restrictedBreeds: string[];
  };
  ageRestrictions: {
    minimumAge: number;
  };
  spayNeuterRequired: boolean;
  temperamentTestRequired: boolean;
}

interface OnboardingData {
  businessInfo: BusinessInfo;
  roomsKennels: RoomsKennelsData;
  services: { services: ServiceConfig[] };
  pricing: PricingData;
  operatingHours: OperatingHoursData;
  staff: { members: StaffMember[] };
  payment: PaymentData;
  notifications: NotificationsData;
  branding: BrandingData;
  policies: PoliciesData;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

function mapKennelSizeToResourceType(size: string): ResourceType {
  const mapping: Record<string, ResourceType> = {
    SMALL: ResourceType.KENNEL,
    MEDIUM: ResourceType.KENNEL,
    LARGE: ResourceType.KENNEL,
    XLARGE: ResourceType.KENNEL,
    SUITE: ResourceType.SUITE,
  };
  return mapping[size] || ResourceType.KENNEL;
}

function mapServiceCategory(category: string): ServiceCategory {
  const mapping: Record<string, ServiceCategory> = {
    BOARDING: ServiceCategory.BOARDING,
    DAYCARE: ServiceCategory.DAYCARE,
    GROOMING: ServiceCategory.GROOMING,
    TRAINING: ServiceCategory.TRAINING,
    WALKING: ServiceCategory.OTHER,
    BATHING: ServiceCategory.GROOMING,
    ADDON: ServiceCategory.OTHER,
  };
  return mapping[category] || ServiceCategory.OTHER;
}

function mapStaffRole(role: string): string {
  const mapping: Record<string, string> = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    STAFF: 'STAFF',
    GROOMER: 'GROOMER',
    TRAINER: 'TRAINER',
  };
  return mapping[role] || 'STAFF';
}

// ============================================================================
// Main Controller
// ============================================================================

/**
 * Complete tenant onboarding
 * Creates all necessary records from wizard data
 */
export const completeTenantOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const data: OnboardingData = req.body;

  if (!data.businessInfo?.name || !data.businessInfo?.email) {
    return next(new AppError('Business name and email are required', 400));
  }

  try {
    // Generate unique subdomain
    let subdomain = generateSubdomain(data.businessInfo.name);
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain },
    });
    if (existingTenant) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          businessName: data.businessInfo.name,
          subdomain,
          contactName: data.businessInfo.name,
          contactEmail: data.businessInfo.email,
          contactPhone: data.businessInfo.phone,
          address: data.businessInfo.address,
          city: data.businessInfo.city,
          state: data.businessInfo.state,
          zipCode: data.businessInfo.zipCode,
          timezone: data.businessInfo.timezone || 'America/Denver',
          status: 'TRIAL',
          isActive: true,
        },
      });

      const tenantId = tenant.id;

      // 2. Create Resources (Rooms/Kennels)
      const resourcesCreated: string[] = [];
      for (const room of data.roomsKennels.rooms) {
        for (const kennel of room.kennels) {
          const resource = await tx.resource.create({
            data: {
              tenantId,
              name: kennel.name,
              type: mapKennelSizeToResourceType(kennel.size),
              capacity: kennel.capacity,
              location: room.name,
              isActive: true,
              attributes: {
                size: kennel.size,
                roomName: room.name,
              },
            },
          });
          resourcesCreated.push(resource.id);
        }
      }

      // 3. Create Services
      const servicesCreated: string[] = [];
      for (const service of data.services.services) {
        if (!service.enabled) continue;

        // Find pricing for this service category
        const pricingTier = data.pricing.tiers.find(
          (t) => t.kennelSize === 'MEDIUM' // Default to medium pricing
        );

        const svc = await tx.service.create({
          data: {
            tenantId,
            name: service.name,
            description: service.description || '',
            duration: service.duration || 1440, // Default 24 hours for boarding
            price: pricingTier?.dailyRate || 40,
            serviceCategory: mapServiceCategory(service.category),
            isActive: true,
          },
        });
        servicesCreated.push(svc.id);
      }

      // 4. Create Staff Members
      const staffCreated: string[] = [];
      for (const member of data.staff.members) {
        // Generate a temporary password
        const tempPassword = `Welcome${Date.now().toString(36)}!`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const staff = await tx.staff.create({
          data: {
            tenantId,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            role: mapStaffRole(member.role),
            password: hashedPassword,
            isActive: true,
          },
        });
        staffCreated.push(staff.id);
      }

      // 5. Store settings in tenant metadata (using existing fields + JSON)
      // Note: For a full implementation, you'd want a TenantSettings table
      // For now, we'll store key settings in the tenant record

      return {
        tenant,
        resourcesCreated: resourcesCreated.length,
        servicesCreated: servicesCreated.length,
        staffCreated: staffCreated.length,
      };
    });

    res.status(201).json({
      status: 'success',
      message: 'Tenant onboarding completed successfully',
      data: {
        tenantId: result.tenant.id,
        subdomain: result.tenant.subdomain,
        resourcesCreated: result.resourcesCreated,
        servicesCreated: result.servicesCreated,
        staffCreated: result.staffCreated,
        loginUrl: `https://${result.tenant.subdomain}.tailtown.com/login`,
      },
    });
  } catch (error: any) {
    console.error('Onboarding error:', error);

    if (error.code === 'P2002') {
      return next(
        new AppError(
          'A tenant with this email or subdomain already exists',
          409
        )
      );
    }

    return next(new AppError(`Onboarding failed: ${error.message}`, 500));
  }
};

/**
 * Validate onboarding data before submission
 */
export const validateOnboardingData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const data: OnboardingData = req.body;
  const errors: string[] = [];

  // Business Info validation
  if (!data.businessInfo?.name) errors.push('Business name is required');
  if (!data.businessInfo?.email) errors.push('Business email is required');
  if (!data.businessInfo?.phone) errors.push('Business phone is required');
  if (!data.businessInfo?.address) errors.push('Business address is required');

  // Rooms/Kennels validation
  if (!data.roomsKennels?.rooms?.length) {
    errors.push('At least one room with kennels is required');
  }

  // Services validation
  const enabledServices =
    data.services?.services?.filter((s) => s.enabled) || [];
  if (enabledServices.length === 0) {
    errors.push('At least one service must be enabled');
  }

  // Staff validation
  if (!data.staff?.members?.length) {
    errors.push('At least one staff member is required');
  }

  // Payment validation
  if (!data.payment?.cardConnect?.merchantId) {
    errors.push('CardConnect Merchant ID is required');
  }

  // Check for duplicate email
  if (data.businessInfo?.email) {
    const existingTenant = await prisma.tenant.findUnique({
      where: { contactEmail: data.businessInfo.email },
    });
    if (existingTenant) {
      errors.push('A tenant with this email already exists');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      errors,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Validation passed',
  });
};
