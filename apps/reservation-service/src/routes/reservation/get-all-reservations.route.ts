import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { getAllReservations } from '../../controllers/reservation/index.js';

export const route: Router = expressRouter();

route.use('/', getAllReservations);
