import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { batchCheckResourceAvailability } from '../../controllers/resource/batch-availability.controller.js';

export const route: Router = expressRouter();

route.use('/availability/batch', batchCheckResourceAvailability);
