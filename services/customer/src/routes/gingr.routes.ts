/**
 * Gingr API Routes
 * Routes for testing Gingr API connection and data migration
 */

import express, { Request, Response } from "express";
import { testGingrConnection } from "../controllers/gingr-test.controller";
import {
  startMigration,
  testConnection,
} from "../controllers/gingr-migration.controller";
import { gingrSyncService } from "../services/gingr-sync.service";

const router = express.Router();

// Test Gingr API connection (quick test)
router.post("/test", testGingrConnection);

// Test connection only (no data fetch)
router.post("/test-connection", testConnection);

// Start full migration
router.post("/migrate", startMigration);

// Trigger sync for a specific tenant
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || "dev";
    console.log(`🔄 Manual Gingr sync triggered for tenant: ${tenantId}`);

    const result = await gingrSyncService.syncTenant(tenantId);

    res.json({
      success: result.success,
      data: result,
      message: result.success
        ? `Sync completed: ${result.customersSync} customers, ${result.petsSync} pets, ${result.reservationsSync} reservations, ${result.invoicesSync} invoices`
        : `Sync failed: ${result.errors.join(", ")}`,
    });
  } catch (error: any) {
    console.error("Gingr sync error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Link orphaned invoices to reservations
router.post("/link-invoices", async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || "dev";
    console.log(`🔗 Manual invoice linking triggered for tenant: ${tenantId}`);

    const linkedCount = await gingrSyncService.linkInvoicesToReservations(
      tenantId
    );

    res.json({
      success: true,
      linkedCount,
      message: `Linked ${linkedCount} invoices to reservations`,
    });
  } catch (error: any) {
    console.error("Invoice linking error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Historical sync - backfill data for a custom date range
router.post("/sync-historical", async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || "dev";
    const { fromDate, toDate } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        error: "fromDate and toDate are required (YYYY-MM-DD format)",
      });
    }

    console.log(`📅 Historical sync triggered for tenant: ${tenantId}`);
    console.log(`   Date range: ${fromDate} to ${toDate}`);

    const result = await gingrSyncService.syncHistorical(
      tenantId,
      new Date(fromDate),
      new Date(toDate)
    );

    res.json({
      success: true,
      data: result,
      message: `Historical sync completed: ${result.reservations} reservations, ${result.invoices} invoices, ${result.linked} linked`,
    });
  } catch (error: any) {
    console.error("Historical sync error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
