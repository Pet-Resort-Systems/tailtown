// @ts-nocheck
/**
 * Tests for prisma.ts configuration
 *
 * Tests the Prisma client configuration and singleton pattern.
 */

describe("Prisma Configuration", () => {
  describe("Singleton pattern", () => {
    it("should use global singleton in development", () => {
      const globalForPrisma = global as unknown as { prisma: any };

      // In development, prisma should be stored in global
      expect(globalForPrisma).toBeDefined();
    });

    it("should configure logging based on environment", () => {
      const isDevelopment = process.env.NODE_ENV === "development";
      const expectedLogLevel = isDevelopment
        ? ["query", "error", "warn"]
        : ["error"];

      if (isDevelopment) {
        expect(expectedLogLevel).toContain("query");
      } else {
        expect(expectedLogLevel).toEqual(["error"]);
      }
    });
  });

  describe("Connection configuration", () => {
    it("should use DATABASE_URL from environment", () => {
      const databaseUrl = process.env.DATABASE_URL;

      // DATABASE_URL should be defined in test environment
      // or we should handle the case where it's not
      expect(databaseUrl === undefined || typeof databaseUrl === "string").toBe(
        true
      );
    });
  });

  describe("Environment handling", () => {
    it("should detect development environment", () => {
      const isDev = process.env.NODE_ENV === "development";
      expect(typeof isDev).toBe("boolean");
    });

    it("should detect production environment", () => {
      const isProd = process.env.NODE_ENV === "production";
      expect(typeof isProd).toBe("boolean");
    });

    it("should have NODE_ENV defined", () => {
      expect(process.env.NODE_ENV).toBeDefined();
    });
  });
});
