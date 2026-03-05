import { Router } from 'express';
import * as vaccineRequirementController from '../controllers/vaccineRequirement.controller';

const router = Router();

/**
 * Vaccine Requirement Routes
 * All routes require x-tenant-id header
 */

// Get all vaccine requirements (with filters)
router.get('/vaccine-requirements', vaccineRequirementController.getAllVaccineRequirements);

// Get vaccine requirement by ID
router.get('/vaccine-requirements/:id', vaccineRequirementController.getVaccineRequirementById);

// Create vaccine requirement
router.post('/vaccine-requirements', vaccineRequirementController.createVaccineRequirement);

// Update vaccine requirement
router.put('/vaccine-requirements/:id', vaccineRequirementController.updateVaccineRequirement);

// Delete vaccine requirement
router.delete('/vaccine-requirements/:id', vaccineRequirementController.deleteVaccineRequirement);

// Bulk update display order
router.put('/vaccine-requirements/display-order', vaccineRequirementController.updateDisplayOrder);

// Get applicable requirements for a pet
router.get('/pets/:petId/vaccine-requirements', vaccineRequirementController.getApplicableRequirements);

// Check pet's vaccine compliance
router.get('/pets/:petId/vaccine-compliance', vaccineRequirementController.checkPetCompliance);

export default router;
