#!/usr/bin/env node
/**
 * Incremental Gingr Sync Script
 *
 * This script performs a lightweight sync of only recent changes from Gingr.
 * Safe to run hourly without performance issues.
 *
 * Features:
 * - Only syncs reservations from last 7 days to next 30 days (narrow window)
 * - Skips existing reservations (upsert only if changed)
 * - Fast execution (completes in seconds)
 * - Minimal database load
 *
 * Usage:
 *   node incremental-gingr-sync.js [tenantId]
 *
 * Example:
 *   node incremental-gingr-sync.js b696b4e8-6e86-4d4b-a0c2-1da0e4b1ae05
 */

const { PrismaClient } = require("@prisma/client");
const { GingrApiClient } = require("../dist/services/gingr-api.service");
const {
  extractGingrLodging,
  getServiceNameForResourceType,
} = require("../dist/services/gingr-resource-mapper.service");

const prisma = new PrismaClient();

// Configuration
const GINGR_CONFIG = {
  subdomain: process.env.GINGR_SUBDOMAIN || "tailtownpetresort",
  apiKey: process.env.GINGR_API_KEY || "c84c09ecfacdf23a495505d2ae1df533",
};

// Sync window: last 7 days to next 30 days (only active/upcoming reservations)
const SYNC_WINDOW_PAST_DAYS = 7;
const SYNC_WINDOW_FUTURE_DAYS = 30;

/**
 * Parse Gingr date correctly - preserve local date without timezone conversion
 * Gingr sends dates like "2025-11-28T19:00:00-07:00" which when parsed as UTC
 * becomes "2025-11-29T02:00:00Z" - we need to preserve the local date (2025-11-28)
 */
function parseGingrDate(dateStr) {
  if (!dateStr) return null;
  // Extract the local date and time parts, ignoring timezone
  // Format: "2025-11-28T19:00:00-07:00" -> use "2025-11-28T19:00:00"
  const localPart = dateStr.replace(/[+-]\d{2}:\d{2}$/, "");
  return new Date(localPart);
}

/**
 * Determine resource type from lodging name
 */
function determineResourceType(lodgingName) {
  if (!lodgingName) return "JUNIOR_KENNEL";
  const name = lodgingName.toUpperCase();

  if (name.includes("VIP") || name.startsWith("V")) return "VIP_ROOM";
  if (name.includes("CAT") || name.includes("CONDO")) return "CAT_CONDO";
  if (name.endsWith("K") || name.includes("KING")) return "KING_KENNEL";
  if (name.endsWith("Q") || name.includes("QUEEN")) return "QUEEN_KENNEL";
  if (name.endsWith("R") || name.includes("JUNIOR")) return "JUNIOR_KENNEL";

  return "JUNIOR_KENNEL";
}

/**
 * Get or create service based on resource type
 */
async function getOrCreateService(
  tenantId,
  serviceName,
  serviceCategory = "BOARDING"
) {
  let service = await prisma.service.findFirst({
    where: { tenantId, name: serviceName },
  });

  if (!service) {
    console.log(`  Creating service: ${serviceName}`);
    service = await prisma.service.create({
      data: {
        tenantId,
        name: serviceName,
        serviceCategory,
        duration: 1440,
        price: 0,
        isActive: true,
      },
    });
  }

  return service;
}

/**
 * Sync reservations incrementally
 */
async function syncReservations(tenantId, gingrClient) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - SYNC_WINDOW_PAST_DAYS);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + SYNC_WINDOW_FUTURE_DAYS);

  console.log(
    `\n📅 Fetching reservations from ${
      startDate.toISOString().split("T")[0]
    } to ${endDate.toISOString().split("T")[0]}...`
  );

  const reservations = await gingrClient.fetchAllReservations(
    startDate,
    endDate
  );
  console.log(`   Found ${reservations.length} reservations in Gingr`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const reservation of reservations) {
    try {
      // Find customer and pet
      const customer = await prisma.customer.findFirst({
        where: { tenantId, externalId: reservation.owner.id },
      });

      const pet = await prisma.pet.findFirst({
        where: { tenantId, externalId: reservation.animal.id + "-tailtown" },
      });

      if (!customer || !pet) {
        skipped++;
        continue;
      }

      // Determine service based on resource type (new approach - Nov 2025)
      const gingrLodging = extractGingrLodging(reservation);
      let serviceName;
      let serviceCategory = "BOARDING";

      if (gingrLodging) {
        const resourceType = determineResourceType(gingrLodging);
        serviceName = getServiceNameForResourceType(resourceType);
        console.log(
          `  Mapped lodging "${gingrLodging}" → ${resourceType} → "${serviceName}"`
        );
      } else {
        // Fallback: Use Gingr reservation type
        const gingrType = reservation.reservation_type?.type || "Boarding";
        if (gingrType.includes("Day Camp") && !gingrType.includes("Lodging")) {
          serviceName = gingrType.includes("Half")
            ? "Day Camp | Half Day"
            : "Day Camp | Full Day";
          serviceCategory = "DAYCARE";
        } else {
          serviceName = "Boarding | Indoor Suite";
        }
      }

      const service = await getOrCreateService(
        tenantId,
        serviceName,
        serviceCategory
      );

      // Prepare reservation data
      const reservationData = {
        customerId: customer.id,
        petId: pet.id,
        serviceId: service.id,
        startDate: parseGingrDate(reservation.start_date),
        endDate: parseGingrDate(reservation.end_date),
        status: reservation.cancelled_date
          ? "CANCELLED"
          : reservation.check_out_date
          ? "COMPLETED"
          : reservation.check_in_date
          ? "CHECKED_IN"
          : reservation.confirmed_date
          ? "CONFIRMED"
          : "PENDING",
        notes: reservation.notes?.reservation_notes,
        externalId: reservation.reservation_id,
      };

      // Check if exists
      const existing = await prisma.reservation.findFirst({
        where: { tenantId, externalId: reservation.reservation_id },
      });

      if (existing) {
        // Update if changed
        await prisma.reservation.update({
          where: { id: existing.id },
          data: reservationData,
        });
        updated++;
      } else {
        // Create new
        await prisma.reservation.create({
          data: { ...reservationData, tenantId },
        });
        created++;
      }
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.error(
          `   ⚠️  Error syncing reservation ${reservation.reservation_id}:`,
          error.message
        );
      }
    }
  }

  console.log(
    `\n✅ Reservations: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`
  );

  return { created, updated, skipped, errors };
}

/**
 * Main sync function
 */
async function incrementalSync(tenantId) {
  console.log("🔄 Starting Incremental Gingr Sync");
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Time: ${new Date().toISOString()}`);

  const startTime = Date.now();

  try {
    // Initialize Gingr API client
    const gingrClient = new GingrApiClient(GINGR_CONFIG);

    // Sync reservations only (customers and pets are stable, don't need hourly sync)
    const result = await syncReservations(tenantId, gingrClient);

    // Update last sync timestamp
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { lastGingrSyncAt: new Date() },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Sync complete in ${duration}s`);

    return {
      success: true,
      duration,
      ...result,
    };
  } catch (error) {
    console.error("\n❌ Sync failed:", error.message);
    console.error(error.stack);

    return {
      success: false,
      error: error.message,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Sync all enabled tenants
 */
async function syncAllEnabledTenants() {
  console.log("🔄 Syncing all enabled tenants...\n");

  const tenants = await prisma.tenant.findMany({
    where: {
      gingrSyncEnabled: true,
      isActive: true,
      status: "ACTIVE",
    },
  });

  console.log(`Found ${tenants.length} enabled tenants\n`);

  const results = [];

  for (const tenant of tenants) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Syncing: ${tenant.businessName} (${tenant.subdomain})`);
    console.log("=".repeat(60));

    const result = await incrementalSync(tenant.id);
    results.push({
      tenantId: tenant.id,
      businessName: tenant.businessName,
      ...result,
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  results.forEach((r) => {
    const status = r.success ? "✅" : "❌";
    console.log(
      `${status} ${r.businessName}: ${r.created || 0} created, ${
        r.updated || 0
      } updated (${r.duration || "N/A"}s)`
    );
  });

  await prisma.$disconnect();
}

// Run the script
if (require.main === module) {
  const tenantId = process.argv[2];

  if (tenantId) {
    // Sync specific tenant
    incrementalSync(tenantId)
      .then((result) => {
        process.exit(result.success ? 0 : 1);
      })
      .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
      });
  } else {
    // Sync all enabled tenants
    syncAllEnabledTenants()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
      });
  }
}

module.exports = { incrementalSync, syncAllEnabledTenants };
