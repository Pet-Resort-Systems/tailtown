import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { getCustomerReservations } from '../../controllers/reservation/index.js';

export const route: Router = expressRouter();

route.use('/customer/:customerId', getCustomerReservations);
