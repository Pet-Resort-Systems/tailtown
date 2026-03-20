import express from 'express';
import * as resourceController from '../controllers/resource';
import { CacheStrategies } from '../middleware/cache.middleware';

export const resourceRoutes = express.Router();

// Resource routes
resourceRoutes.get(
  '/',
  CacheStrategies.medium(),
  resourceController.getAllResources
);

// Specific routes must come before parameter routes
// Resource availability routes
resourceRoutes.get('/availability', resourceController.getResourceAvailability); // GET endpoint for resource availability
resourceRoutes.post(
  '/availability/batch',
  resourceController.getBatchResourceAvailability
); // Batch resource availability
resourceRoutes.get(
  '/available',
  resourceController.getAvailableResourcesByDate
);
resourceRoutes.put(
  '/availability/:id',
  resourceController.updateAvailabilitySlot
);
resourceRoutes.delete(
  '/availability/:id',
  resourceController.deleteAvailabilitySlot
);

// Parameter routes come after specific routes
resourceRoutes.get('/:id', resourceController.getResource);
resourceRoutes.post('/', resourceController.createResource);
resourceRoutes.put('/:id', resourceController.updateResource);
resourceRoutes.delete('/:id', resourceController.deleteResource);
resourceRoutes.post(
  '/:resourceId/availability',
  resourceController.createAvailabilitySlot
);
