/**
 * Schedule Template Routes
 *
 * Routes for recurring schedule templates and holiday management
 */

import { Router } from "express";
import {
  getStaffTemplates,
  getAllActiveTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addTemplateEntry,
  updateTemplateEntry,
  deleteTemplateEntry,
  generateSchedules,
  generateAllSchedules,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../controllers/staff/schedule-template.controller";

const router = Router();

// ============================================
// SCHEDULE TEMPLATES
// ============================================

// Get all active templates (for schedule generation)
router.get("/templates", getAllActiveTemplates);

// Generate schedules for all active templates
router.post("/templates/generate-all", generateAllSchedules);

// Get templates for a specific staff member
router.get("/staff/:staffId/templates", getStaffTemplates);

// Create a template for a staff member
router.post("/staff/:staffId/templates", createTemplate);

// Update a template
router.patch("/templates/:templateId", updateTemplate);

// Delete a template
router.delete("/templates/:templateId", deleteTemplate);

// Generate schedules from a specific template
router.post("/templates/:templateId/generate", generateSchedules);

// ============================================
// TEMPLATE ENTRIES
// ============================================

// Add an entry to a template
router.post("/templates/:templateId/entries", addTemplateEntry);

// Update an entry
router.patch("/entries/:entryId", updateTemplateEntry);

// Delete an entry
router.delete("/entries/:entryId", deleteTemplateEntry);

// ============================================
// BUSINESS HOLIDAYS
// ============================================

// Get all holidays
router.get("/holidays", getHolidays);

// Create a holiday
router.post("/holidays", createHoliday);

// Update a holiday
router.patch("/holidays/:holidayId", updateHoliday);

// Delete a holiday
router.delete("/holidays/:holidayId", deleteHoliday);

export default router;
