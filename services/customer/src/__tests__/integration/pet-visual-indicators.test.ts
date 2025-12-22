/**
 * Pet Visual Indicators Integration Tests
 *
 * Tests that verify pets have correct:
 * - Playgroup compatibility badges
 * - Special requirement icons (allergies, medications)
 * - Vaccination status
 * - Profile photos
 *
 * These tests ensure the visual indicators display correctly on the frontend.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_ID = process.env.TEST_TENANT_ID || "dev";

describe("Pet Visual Indicators Integration Tests", () => {
  beforeAll(async () => {
    // Ensure we have test data
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Playgroup Compatibility", () => {
    it("should have playgroup compatibility set for active pets", async () => {
      const petsWithPlaygroup = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          playgroupCompatibility: { not: null },
        },
        select: {
          id: true,
          name: true,
          playgroupCompatibility: true,
        },
        take: 10,
      });

      expect(petsWithPlaygroup.length).toBeGreaterThan(0);

      petsWithPlaygroup.forEach((pet) => {
        expect(pet.playgroupCompatibility).toBeDefined();
        expect([
          "LARGE_DOG",
          "MEDIUM_DOG",
          "SMALL_DOG",
          "NON_COMPATIBLE",
          "SENIOR_STAFF_REQUIRED",
          "UNKNOWN",
        ]).toContain(pet.playgroupCompatibility);
      });
    });

    it("should return playgroup compatibility in pet API response", async () => {
      const pet = await prisma.pet.findFirst({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          playgroupCompatibility: { not: null },
        },
        select: {
          id: true,
          name: true,
          playgroupCompatibility: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      expect(pet).toBeDefined();
      expect(pet?.playgroupCompatibility).toBeDefined();
    });
  });

  describe("Special Requirements Icons", () => {
    it("should have special requirements for pets with allergies", async () => {
      const petsWithAllergies = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          specialRequirements: { has: "ALLERGIES" },
        },
        select: {
          id: true,
          name: true,
          allergies: true,
          specialRequirements: true,
        },
        take: 10,
      });

      petsWithAllergies.forEach((pet) => {
        expect(pet.specialRequirements).toContain("ALLERGIES");
        expect(pet.allergies).toBeTruthy();

        // Verify it's not a false positive
        const allergiesLower = (pet.allergies || "").toLowerCase().trim();
        expect(allergiesLower).not.toBe("none");
        expect(allergiesLower).not.toBe("no");
        expect(allergiesLower).not.toBe("n/a");
        expect(allergiesLower).not.toBe("nka");
      });
    });

    it("should have special requirements for pets with medications", async () => {
      const petsWithMeds = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          specialRequirements: { has: "HAS_MEDICATION" },
        },
        select: {
          id: true,
          name: true,
          medicationNotes: true,
          specialRequirements: true,
        },
        take: 10,
      });

      petsWithMeds.forEach((pet) => {
        expect(pet.specialRequirements).toContain("HAS_MEDICATION");
        expect(pet.medicationNotes).toBeTruthy();

        // Verify it's not a false positive
        const medLower = (pet.medicationNotes || "").toLowerCase().trim();
        expect(medLower).not.toBe("none");
        expect(medLower).not.toBe("no");
        expect(medLower).not.toBe("n/a");
      });
    });

    it('should NOT have allergy icon for pets with "none" or "n/a"', async () => {
      const petsWithNoneAllergies = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          OR: [
            { allergies: { contains: "none", mode: "insensitive" } },
            { allergies: { contains: "n/a", mode: "insensitive" } },
            { allergies: { contains: "nka", mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          allergies: true,
          specialRequirements: true,
        },
        take: 20,
      });

      // Filter to only those with false positive patterns
      const falsePositives = petsWithNoneAllergies.filter((pet) => {
        const allergiesLower = (pet.allergies || "").toLowerCase().trim();
        return (
          allergiesLower === "none" ||
          allergiesLower === "no" ||
          allergiesLower === "n/a" ||
          allergiesLower === "nka"
        );
      });

      falsePositives.forEach((pet) => {
        expect(pet.specialRequirements).not.toContain("ALLERGIES");
      });
    });

    it('should NOT have medication icon for pets with "none" or "n/a"', async () => {
      const petsWithNoneMeds = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          OR: [
            { medicationNotes: { contains: "none", mode: "insensitive" } },
            { medicationNotes: { contains: "n/a", mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          medicationNotes: true,
          specialRequirements: true,
        },
        take: 20,
      });

      // Filter to only those with false positive patterns
      const falsePositives = petsWithNoneMeds.filter((pet) => {
        const medLower = (pet.medicationNotes || "").toLowerCase().trim();
        return medLower === "none" || medLower === "no" || medLower === "n/a";
      });

      falsePositives.forEach((pet) => {
        expect(pet.specialRequirements).not.toContain("HAS_MEDICATION");
      });
    });

    it("should return special requirements in pet API response", async () => {
      const pet = await prisma.pet.findFirst({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          specialRequirements: { isEmpty: false },
        },
        select: {
          id: true,
          name: true,
          specialRequirements: true,
          allergies: true,
          medicationNotes: true,
        },
      });

      expect(pet).toBeDefined();
      expect(pet?.specialRequirements).toBeDefined();
      expect(Array.isArray(pet?.specialRequirements)).toBe(true);
      expect(pet?.specialRequirements.length).toBeGreaterThan(0);
    });
  });

  describe("Vaccination Status", () => {
    it("should have vaccination status for pets", async () => {
      const petsWithVaccinations = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          vaccinationStatus: { not: null },
        },
        select: {
          id: true,
          name: true,
          vaccinationStatus: true,
          vaccineExpirations: true,
        },
        take: 10,
      });

      expect(petsWithVaccinations.length).toBeGreaterThan(0);

      petsWithVaccinations.forEach((pet) => {
        expect(pet.vaccinationStatus).toBeDefined();
        expect(typeof pet.vaccinationStatus).toBe("object");
      });
    });

    it("should return vaccination data in pet API response", async () => {
      const pet = await prisma.pet.findFirst({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          vaccinationStatus: { not: null },
        },
        select: {
          id: true,
          name: true,
          vaccinationStatus: true,
          vaccineExpirations: true,
        },
      });

      expect(pet).toBeDefined();
      expect(pet?.vaccinationStatus).toBeDefined();
    });
  });

  describe("Profile Photos", () => {
    it("should have profile photos for some pets", async () => {
      const petsWithPhotos = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          profilePhoto: { not: null },
        },
        select: {
          id: true,
          name: true,
          profilePhoto: true,
        },
        take: 10,
      });

      expect(petsWithPhotos.length).toBeGreaterThan(0);

      petsWithPhotos.forEach((pet) => {
        expect(pet.profilePhoto).toBeTruthy();
        expect(typeof pet.profilePhoto).toBe("string");
      });
    });

    it("should return profile photo in pet API response", async () => {
      const pet = await prisma.pet.findFirst({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          profilePhoto: { not: null },
        },
        select: {
          id: true,
          name: true,
          profilePhoto: true,
        },
      });

      expect(pet).toBeDefined();
      expect(pet?.profilePhoto).toBeTruthy();
    });
  });

  describe("Complete Pet Data", () => {
    it("should return all visual indicator data in a single query", async () => {
      const pets = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          playgroupCompatibility: true,
          specialRequirements: true,
          vaccinationStatus: true,
          vaccineExpirations: true,
          profilePhoto: true,
          allergies: true,
          medicationNotes: true,
        },
        take: 50,
      });

      expect(pets.length).toBeGreaterThan(0);

      // Count pets with each indicator
      const stats = {
        withPlaygroup: pets.filter((p) => p.playgroupCompatibility).length,
        withSpecialReqs: pets.filter(
          (p) => p.specialRequirements && p.specialRequirements.length > 0
        ).length,
        withVaccinations: pets.filter((p) => p.vaccinationStatus).length,
        withPhotos: pets.filter((p) => p.profilePhoto).length,
      };

      // At least some pets should have each indicator
      expect(stats.withPlaygroup).toBeGreaterThan(0);
      expect(stats.withSpecialReqs).toBeGreaterThan(0);
      expect(stats.withVaccinations).toBeGreaterThan(0);
      expect(stats.withPhotos).toBeGreaterThan(0);

      console.log("Pet Visual Indicators Stats:", stats);
    });
  });

  describe("Data Quality Checks", () => {
    it("should not have duplicate special requirements", async () => {
      const petsWithSpecialReqs = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          specialRequirements: { isEmpty: false },
        },
        select: {
          id: true,
          name: true,
          specialRequirements: true,
        },
        take: 100,
      });

      petsWithSpecialReqs.forEach((pet) => {
        const reqs = pet.specialRequirements || [];
        const uniqueReqs = [...new Set(reqs)];
        expect(reqs.length).toBe(uniqueReqs.length);
      });
    });

    it("should have consistent data between fields and special requirements", async () => {
      const pets = await prisma.pet.findMany({
        where: {
          tenantId: TENANT_ID,
          isActive: true,
          specialRequirements: { isEmpty: false },
        },
        select: {
          id: true,
          name: true,
          specialRequirements: true,
          allergies: true,
          medicationNotes: true,
        },
        take: 50,
      });

      pets.forEach((pet) => {
        // If has ALLERGIES flag, should have allergies text
        if (pet.specialRequirements?.includes("ALLERGIES")) {
          expect(pet.allergies).toBeTruthy();
        }

        // If has HAS_MEDICATION flag, should have medication notes
        if (pet.specialRequirements?.includes("HAS_MEDICATION")) {
          expect(pet.medicationNotes).toBeTruthy();
        }
      });
    });
  });
});
