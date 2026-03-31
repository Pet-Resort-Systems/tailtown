import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { route as addAddOnsToReservationRoute } from './add-add-ons-to-reservation.route.js';
import { route as createReservationRoute } from './create-reservation.route.js';
import { route as deleteReservationRoute } from './delete-reservation.route.js';
import { route as getAllReservationsRoute } from './get-all-reservations.route.js';
import { route as getCustomerReservationsRoute } from './get-customer-reservations.route.js';
import { route as getReservationByIdRoute } from './get-reservation-by-id.route.js';
import { route as getTodayRevenueRoute } from './get-today-revenue.route.js';
import { route as updateReservationRoute } from './update-reservation.route.js';

const router: Router = expressRouter();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Reservation routes healthy' });
});

router.get('/customer/:customerId', getCustomerReservationsRoute);
router.get('/revenue/today', getTodayRevenueRoute);
router.get('/', getAllReservationsRoute);
router.post('/', createReservationRoute);
router.get('/:id', getReservationByIdRoute);
router.patch('/:id', updateReservationRoute);
router.delete('/:id', deleteReservationRoute);
router.post('/:id/add-ons', addAddOnsToReservationRoute);

export default router;
