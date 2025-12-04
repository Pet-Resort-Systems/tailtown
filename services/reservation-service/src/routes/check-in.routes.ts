import express from "express";
import * as checkInTemplateController from "../controllers/check-in-template.controller";
import * as checkInController from "../controllers/check-in.controller";
import * as serviceAgreementController from "../controllers/service-agreement.controller";

const router = express.Router();

/**
 * Check-In Template Routes
 */

// Get all templates
router.get("/check-in-templates", checkInTemplateController.getAllTemplates);

// Get default template
router.get(
  "/check-in-templates/default",
  checkInTemplateController.getDefaultTemplate
);

// Get template by ID
router.get(
  "/check-in-templates/:id",
  checkInTemplateController.getTemplateById
);

// Create template
router.post("/check-in-templates", checkInTemplateController.createTemplate);

// Update template
router.put("/check-in-templates/:id", checkInTemplateController.updateTemplate);

// Delete template
router.delete(
  "/check-in-templates/:id",
  checkInTemplateController.deleteTemplate
);

// Clone template
router.post(
  "/check-in-templates/:id/clone",
  checkInTemplateController.cloneTemplate
);

/**
 * Check-In Routes
 */

// Get all check-ins
router.get("/check-ins", checkInController.getAllCheckIns);

// Get check-in by ID
router.get("/check-ins/:id", checkInController.getCheckInById);

// Create check-in
router.post("/check-ins", checkInController.createCheckIn);

// Update check-in
router.put("/check-ins/:id", checkInController.updateCheckIn);

// Medication management
router.post("/check-ins/:id/medications", checkInController.addMedication);
router.put(
  "/check-ins/:checkInId/medications/:medicationId",
  checkInController.updateMedication
);
router.delete(
  "/check-ins/:checkInId/medications/:medicationId",
  checkInController.deleteMedication
);

// Belonging management
router.put(
  "/check-ins/:checkInId/belongings/:belongingId/return",
  checkInController.returnBelonging
);

/**
 * Service Agreement Template Routes
 */

// Get all agreement templates
router.get(
  "/service-agreement-templates",
  serviceAgreementController.getAllTemplates
);

// Get default agreement template
router.get(
  "/service-agreement-templates/default",
  serviceAgreementController.getDefaultTemplate
);

// Get agreement template by ID
router.get(
  "/service-agreement-templates/:id",
  serviceAgreementController.getTemplateById
);

// Create agreement template
router.post(
  "/service-agreement-templates",
  serviceAgreementController.createTemplate
);

// Update agreement template
router.put(
  "/service-agreement-templates/:id",
  serviceAgreementController.updateTemplate
);

// Delete agreement template
router.delete(
  "/service-agreement-templates/:id",
  serviceAgreementController.deleteTemplate
);

/**
 * Service Agreement Routes
 */

// Create signed agreement
router.post("/service-agreements", serviceAgreementController.createAgreement);

// Get all signed agreements for tenant
router.get("/service-agreements", serviceAgreementController.getAllAgreements);

// Get agreement by check-in ID
router.get(
  "/service-agreements/check-in/:checkInId",
  serviceAgreementController.getAgreementByCheckIn
);

// Get all agreements for a customer
router.get(
  "/service-agreements/customer/:customerId",
  serviceAgreementController.getAgreementsByCustomer
);

// Check if customer has valid agreement
router.get(
  "/service-agreements/customer/:customerId/valid",
  serviceAgreementController.checkCustomerAgreement
);

// Get agreement by ID
router.get(
  "/service-agreements/:id",
  serviceAgreementController.getAgreementById
);

// Invalidate an agreement
router.put(
  "/service-agreements/:id/invalidate",
  serviceAgreementController.invalidateAgreement
);

// Get version history for a template
router.get(
  "/service-agreement-templates/:id/versions",
  serviceAgreementController.getTemplateVersions
);

// Get specific version of a template
router.get(
  "/service-agreement-templates/:id/versions/:version",
  serviceAgreementController.getTemplateVersion
);

export default router;
