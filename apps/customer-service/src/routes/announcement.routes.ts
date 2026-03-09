import { Router } from "express";
import * as announcementController from "../controllers/announcement.controller";
import {
  authenticate,
  requireTenantAdmin,
} from "../middleware/auth.middleware";

const router = Router();

// Get active announcements for current user (excludes dismissed)
// No auth required - announcements should be visible to all
router.get("/", announcementController.getActiveAnnouncements);

// Get all announcements (admin view) - requires admin auth
router.get(
  "/all",
  authenticate,
  requireTenantAdmin,
  announcementController.getAllAnnouncements
);

// Create new announcement - requires admin auth
router.post(
  "/",
  authenticate,
  requireTenantAdmin,
  announcementController.createAnnouncement
);

// Update announcement - requires admin auth
router.put(
  "/:id",
  authenticate,
  requireTenantAdmin,
  announcementController.updateAnnouncement
);

// Delete announcement - requires admin auth
router.delete(
  "/:id",
  authenticate,
  requireTenantAdmin,
  announcementController.deleteAnnouncement
);

// Dismiss announcement for current user - requires auth
router.post(
  "/:id/dismiss",
  authenticate,
  announcementController.dismissAnnouncement
);

export default router;
