import express from 'express';
import {
  getAllAddOnServices,
  getAddOnServiceById,
  createAddOnService,
  updateAddOnService,
  deleteAddOnService
} from '../controllers/addon.controller';

const router = express.Router();

// GET all add-on services
router.get('/', getAllAddOnServices);

// GET a single add-on service by ID
router.get('/:id', getAddOnServiceById);

// POST a new add-on service
router.post('/', createAddOnService);

// PUT (update) an add-on service
router.put('/:id', updateAddOnService);

// DELETE an add-on service
router.delete('/:id', deleteAddOnService);

export default router;
