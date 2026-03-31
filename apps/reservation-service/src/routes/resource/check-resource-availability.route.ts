import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { checkResourceAvailability } from '../../controllers/resource/availability.controller.js';

export const route: Router = expressRouter();

route.use('/availability', checkResourceAvailability);
