import express from 'express';
import {
  getSuiteCapacityConfig,
  updateSuiteCapacityConfig,
  getAllSuiteCapacities,
  createSuiteCapacity,
  updateSuiteCapacity,
  deleteSuiteCapacity,
  calculateMultiPetPricing,
  checkPetCompatibility,
  getSuiteOccupancy,
  checkSuiteAvailability
} from '../controllers/multiPet.controller';

const router = express.Router();

// Configuration
router.get('/config', getSuiteCapacityConfig);
router.put('/config', updateSuiteCapacityConfig);

// Suite Capacities
router.get('/capacities', getAllSuiteCapacities);
router.post('/capacities', createSuiteCapacity);
router.put('/capacities/:id', updateSuiteCapacity);
router.delete('/capacities/:id', deleteSuiteCapacity);

// Calculations & Checks
router.post('/calculate-pricing', calculateMultiPetPricing);
router.post('/check-compatibility', checkPetCompatibility);
router.get('/occupancy/:suiteId', getSuiteOccupancy);
router.post('/check-availability', checkSuiteAvailability);

export default router;
