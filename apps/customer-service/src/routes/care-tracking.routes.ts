/**
 * Care Tracking Routes
 *
 * Routes for feeding logs and medication administration tracking
 */

import { Router } from 'express';
import {
  getCheckedInPets,
  createFeedingLog,
  getFeedingLogs,
  getFeedingReport,
  getPetMedications,
  createPetMedication,
  updatePetMedication,
  deletePetMedication,
  getPetsNeedingMedication,
  createMedicationLog,
  getMedicationLogs,
  getMedicationReport,
  togglePickyEater,
} from '../controllers/care-tracking.controller.js';

const router = Router();

// ============================================
// FEEDING ROUTES
// ============================================

// Get all checked-in pets for feeding tracking
router.get('/feeding/pets', getCheckedInPets);

// Log a feeding
router.post('/feeding', createFeedingLog);

// Get feeding logs for a pet
router.get('/feeding/pet/:petId', getFeedingLogs);

// Get feeding report
router.get('/feeding/report', getFeedingReport);

// Toggle picky eater flag
router.patch('/pets/:petId/picky-eater', togglePickyEater);

// ============================================
// MEDICATION ROUTES
// ============================================

// Get pets needing medication today
router.get('/medications/pets', getPetsNeedingMedication);

// Get medications for a pet
router.get('/medications/pet/:petId', getPetMedications);

// Create a medication for a pet
router.post('/medications/pet/:petId', createPetMedication);

// Update a medication
router.patch('/medications/:medicationId', updatePetMedication);

// Delete (deactivate) a medication
router.delete('/medications/:medicationId', deletePetMedication);

// Log medication administration
router.post('/medications/log', createMedicationLog);

// Get medication logs for a pet
router.get('/medications/log/pet/:petId', getMedicationLogs);

// Get medication report
router.get('/medications/report', getMedicationReport);

export default router;
