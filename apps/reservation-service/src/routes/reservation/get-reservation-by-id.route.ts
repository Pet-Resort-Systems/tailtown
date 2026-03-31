import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { getReservationById } from '../../controllers/reservation/index.js';

export const route: Router = expressRouter();

route.use('/:id', getReservationById);
