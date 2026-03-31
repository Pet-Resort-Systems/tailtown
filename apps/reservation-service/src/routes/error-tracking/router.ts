import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { route as getAllErrorsRoute } from './get-all-errors.route.js';
import { route as getErrorAnalyticsRoute } from './get-error-analytics.route.js';
import { route as getErrorByIdRoute } from './get-error-by-id.route.js';
import { route as resolveErrorRoute } from './resolve-error.route.js';

const router: Router = expressRouter();

router.get('/', getAllErrorsRoute);
router.get('/analytics', getErrorAnalyticsRoute);
router.get('/:id', getErrorByIdRoute);
router.patch('/:id/resolve', resolveErrorRoute);

export default router;
