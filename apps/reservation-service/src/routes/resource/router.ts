import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { route as batchCheckResourceAvailabilityRoute } from './batch-check-resource-availability.route.js';
import { route as checkResourceAvailabilityRoute } from './check-resource-availability.route.js';
import { route as createResourceRoute } from './create-resource.route.js';
import { route as deleteResourceRoute } from './delete-resource.route.js';
import { route as getAllResourcesRoute } from './get-all-resources.route.js';
import { route as getResourceAvailabilityRoute } from './get-resource-availability.route.js';
import { route as getResourceByIdRoute } from './get-resource-by-id.route.js';
import { route as updateResourceRoute } from './update-resource.route.js';

const router: Router = expressRouter();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Resource routes healthy' });
});

router.get('/availability', checkResourceAvailabilityRoute);
router.post('/availability/batch', batchCheckResourceAvailabilityRoute);
router.get('/', getAllResourcesRoute);
router.post('/', createResourceRoute);
router.get('/:id/availability', getResourceAvailabilityRoute);
router.get('/:id', getResourceByIdRoute);
router.patch('/:id', updateResourceRoute);
router.delete('/:id', deleteResourceRoute);

export default router;
