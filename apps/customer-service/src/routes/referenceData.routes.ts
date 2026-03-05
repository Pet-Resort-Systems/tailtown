/**
 * Reference Data Routes
 * 
 * Routes for breeds, veterinarians, and temperaments
 */

import express from 'express';
import {
  getBreeds,
  getVeterinarians,
  getTemperamentTypes,
  getPetTemperaments,
  updatePetTemperaments
} from '../controllers/referenceData.controller';

const router = express.Router();

// Breeds
router.get('/breeds', getBreeds);

// Veterinarians
router.get('/veterinarians', getVeterinarians);

// Temperament Types
router.get('/temperament-types', getTemperamentTypes);

// Pet Temperaments
router.get('/pets/:petId/temperaments', getPetTemperaments);
router.put('/pets/:petId/temperaments', updatePetTemperaments);

export default router;
