import { Router } from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  deactivateService,
  getServiceAddOns,
  getServiceReservations
} from '../controllers/service.controller';
import { CacheStrategies } from '../middleware/cache.middleware';

const router = Router();

// GET all services (cache for 1 hour - services rarely change)
router.get('/', CacheStrategies.medium(), getAllServices);

// GET a single service by ID (cache for 1 hour)
router.get('/:id', CacheStrategies.medium(), getServiceById);

// GET all add-ons for a service
router.get('/:id/add-ons', getServiceAddOns);

// GET all reservations for a service
router.get('/:id/reservations', getServiceReservations);

// POST create a new service
router.post('/', createService);

// PUT update a service
router.put('/:id', updateService);

// PATCH deactivate a service (soft delete)
router.patch('/:id/deactivate', deactivateService);

// DELETE a service
router.delete('/:id', deleteService);

export { router as serviceRoutes };
