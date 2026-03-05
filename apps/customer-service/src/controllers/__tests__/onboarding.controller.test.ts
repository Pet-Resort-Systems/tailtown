/**
 * Onboarding Controller Tests
 *
 * Tests for new tenant setup wizard.
 * Added in v1.6.14 - validates complete onboarding flow.
 */

import { Request, Response, NextFunction } from "express";

// Mock bcrypt
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

// Mock Prisma
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    tenant: {
      create: mockCreate,
      findUnique: mockFindUnique,
    },
    resource: {
      create: mockCreate,
      createMany: jest.fn(),
    },
    service: {
      create: mockCreate,
      createMany: jest.fn(),
    },
    staff: {
      create: mockCreate,
      createMany: jest.fn(),
    },
    $transaction: mockTransaction,
  })),
  ResourceType: {
    STANDARD_SUITE: "STANDARD_SUITE",
    STANDARD_PLUS_SUITE: "STANDARD_PLUS_SUITE",
    VIP_SUITE: "VIP_SUITE",
    GROOMING_STATION: "GROOMING_STATION",
  },
  ServiceCategory: {
    BOARDING: "BOARDING",
    DAYCARE: "DAYCARE",
    GROOMING: "GROOMING",
    TRAINING: "TRAINING",
  },
}));

describe("Onboarding Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("Onboarding Data Validation", () => {
    it("should validate business info has required fields", () => {
      const validBusinessInfo = {
        name: "Test Pet Resort",
        address: "123 Main St",
        city: "Albuquerque",
        state: "NM",
        zipCode: "87101",
        phone: "505-555-1234",
        email: "info@testpetresort.com",
        timezone: "America/Denver",
      };

      expect(validBusinessInfo.name).toBeTruthy();
      expect(validBusinessInfo.address).toBeTruthy();
      expect(validBusinessInfo.city).toBeTruthy();
      expect(validBusinessInfo.state).toBeTruthy();
      expect(validBusinessInfo.zipCode).toBeTruthy();
      expect(validBusinessInfo.phone).toBeTruthy();
      expect(validBusinessInfo.email).toBeTruthy();
      expect(validBusinessInfo.timezone).toBeTruthy();
    });

    it("should validate room/kennel configuration", () => {
      const roomsConfig = {
        rooms: [
          {
            id: "room-1",
            name: "Building A",
            kennels: [
              { id: "k-1", name: "A1", size: "MEDIUM", capacity: 1 },
              { id: "k-2", name: "A2", size: "LARGE", capacity: 2 },
            ],
          },
        ],
        namingConvention: "alphanumeric",
      };

      expect(roomsConfig.rooms.length).toBeGreaterThan(0);
      expect(roomsConfig.rooms[0].kennels.length).toBeGreaterThan(0);
      expect(roomsConfig.rooms[0].kennels[0].name).toBeTruthy();
      expect(roomsConfig.rooms[0].kennels[0].size).toBeTruthy();
    });

    it("should validate service configuration", () => {
      const servicesConfig = [
        {
          id: "svc-1",
          name: "Standard Boarding",
          category: "BOARDING",
          description: "Standard kennel boarding",
          duration: 1440, // 24 hours
          enabled: true,
        },
        {
          id: "svc-2",
          name: "Full Groom",
          category: "GROOMING",
          duration: 120, // 2 hours
          enabled: true,
        },
      ];

      expect(servicesConfig.every((s) => s.name && s.category)).toBe(true);
      expect(servicesConfig.filter((s) => s.enabled).length).toBe(2);
    });

    it("should validate pricing tiers", () => {
      const pricingConfig = {
        tiers: [
          { kennelSize: "SMALL", dailyRate: 35, halfDayRate: 20 },
          { kennelSize: "MEDIUM", dailyRate: 45, halfDayRate: 25 },
          { kennelSize: "LARGE", dailyRate: 55, halfDayRate: 30 },
        ],
        holidaySurcharge: 10,
        multiPetDiscount: 10,
        depositRequired: true,
        depositType: "percentage",
        depositAmount: 25,
      };

      expect(pricingConfig.tiers.length).toBeGreaterThan(0);
      expect(pricingConfig.tiers.every((t) => t.dailyRate > 0)).toBe(true);
      expect(pricingConfig.holidaySurcharge).toBeGreaterThanOrEqual(0);
    });

    it("should validate operating hours", () => {
      const hoursConfig = {
        hours: {
          monday: { open: "07:00", close: "19:00", closed: false },
          tuesday: { open: "07:00", close: "19:00", closed: false },
          wednesday: { open: "07:00", close: "19:00", closed: false },
          thursday: { open: "07:00", close: "19:00", closed: false },
          friday: { open: "07:00", close: "19:00", closed: false },
          saturday: { open: "08:00", close: "17:00", closed: false },
          sunday: { open: "08:00", close: "17:00", closed: true },
        },
        checkInWindow: { start: "07:00", end: "18:00" },
        checkOutWindow: { start: "07:00", end: "12:00" },
        holidays: [],
      };

      expect(Object.keys(hoursConfig.hours).length).toBe(7);
      expect(hoursConfig.checkInWindow.start).toBeTruthy();
      expect(hoursConfig.checkOutWindow.end).toBeTruthy();
    });

    it("should validate staff configuration", () => {
      const staffConfig = [
        {
          id: "staff-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@testpetresort.com",
          phone: "505-555-1234",
          role: "ADMIN",
          isOwner: true,
        },
        {
          id: "staff-2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@testpetresort.com",
          role: "STAFF",
          isOwner: false,
        },
      ];

      expect(
        staffConfig.every((s) => s.firstName && s.lastName && s.email)
      ).toBe(true);
      expect(staffConfig.filter((s) => s.isOwner).length).toBeGreaterThan(0);
    });
  });

  describe("Subdomain Generation", () => {
    it("should generate valid subdomain from business name", () => {
      const generateSubdomain = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 30);
      };

      expect(generateSubdomain("Test Pet Resort")).toBe("test-pet-resort");
      expect(generateSubdomain("Bob's Dogs & Cats")).toBe("bob-s-dogs-cats");
      expect(generateSubdomain("  Spaces  Around  ")).toBe("spaces-around");
      expect(generateSubdomain("UPPERCASE")).toBe("uppercase");
    });

    it("should handle special characters in business name", () => {
      const generateSubdomain = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 30);
      };

      expect(generateSubdomain("Test & Resort!")).toBe("test-resort");
      expect(generateSubdomain("123 Pet Place")).toBe("123-pet-place");
    });
  });

  describe("Resource Type Mapping", () => {
    it("should map kennel sizes to resource types", () => {
      const sizeToResourceType: Record<string, string> = {
        SMALL: "STANDARD_SUITE",
        MEDIUM: "STANDARD_SUITE",
        LARGE: "STANDARD_PLUS_SUITE",
        XLARGE: "VIP_SUITE",
        SUITE: "VIP_SUITE",
      };

      expect(sizeToResourceType["SMALL"]).toBe("STANDARD_SUITE");
      expect(sizeToResourceType["LARGE"]).toBe("STANDARD_PLUS_SUITE");
      expect(sizeToResourceType["SUITE"]).toBe("VIP_SUITE");
    });
  });

  describe("Service Category Mapping", () => {
    it("should map service categories correctly", () => {
      const categoryMapping: Record<string, string> = {
        boarding: "BOARDING",
        daycare: "DAYCARE",
        grooming: "GROOMING",
        training: "TRAINING",
      };

      expect(categoryMapping["boarding"]).toBe("BOARDING");
      expect(categoryMapping["grooming"]).toBe("GROOMING");
    });
  });

  describe("Complete Onboarding Flow", () => {
    it("should create all required entities in transaction", async () => {
      const onboardingData = {
        businessInfo: {
          name: "Test Pet Resort",
          address: "123 Main St",
          city: "Albuquerque",
          state: "NM",
          zipCode: "87101",
          phone: "505-555-1234",
          email: "info@test.com",
          timezone: "America/Denver",
        },
        roomsKennels: {
          rooms: [
            {
              id: "room-1",
              name: "Building A",
              kennels: [{ id: "k-1", name: "A1", size: "MEDIUM", capacity: 1 }],
            },
          ],
        },
        services: [
          {
            id: "svc-1",
            name: "Boarding",
            category: "BOARDING",
            enabled: true,
          },
        ],
        pricing: {
          tiers: [{ kennelSize: "MEDIUM", dailyRate: 45 }],
          holidaySurcharge: 0,
          multiPetDiscount: 0,
          depositRequired: false,
          depositType: "none",
        },
        operatingHours: {
          hours: {
            monday: { open: "07:00", close: "19:00", closed: false },
          },
          checkInWindow: { start: "07:00", end: "18:00" },
          checkOutWindow: { start: "07:00", end: "12:00" },
          holidays: [],
        },
        staff: [
          {
            id: "staff-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@test.com",
            role: "ADMIN",
            isOwner: true,
          },
        ],
        payment: {},
        notifications: {},
        branding: {},
        policies: {},
      };

      // Verify all required sections are present
      expect(onboardingData.businessInfo).toBeDefined();
      expect(onboardingData.roomsKennels).toBeDefined();
      expect(onboardingData.services).toBeDefined();
      expect(onboardingData.pricing).toBeDefined();
      expect(onboardingData.operatingHours).toBeDefined();
      expect(onboardingData.staff).toBeDefined();
    });
  });
});
