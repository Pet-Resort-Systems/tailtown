import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { route as addCheckInMedicationRoute } from './add-check-in-medication.route.js';
import { route as batchCheckInRoute } from './batch-check-in.route.js';
import { route as createCheckInRoute } from './create-check-in.route.js';
import { route as deleteCheckInMedicationRoute } from './delete-check-in-medication.route.js';
import { route as getAllCheckInsRoute } from './get-all-check-ins.route.js';
import { route as getCheckInByIdRoute } from './get-check-in-by-id.route.js';
import { route as getCheckInDraftRoute } from './get-check-in-draft.route.js';
import { route as getCheckInRoomPetsRoute } from './get-check-in-room-pets.route.js';
import { route as returnCheckInBelongingRoute } from './return-check-in-belonging.route.js';
import { route as saveCheckInDraftRoute } from './save-check-in-draft.route.js';
import { route as updateCheckInMedicationRoute } from './update-check-in-medication.route.js';
import { route as updateCheckInRoute } from './update-check-in.route.js';

/**
 * Check-In Router
 * Manages pet check-ins with questionnaire responses, medications, and belongings
 */

const router: Router = expressRouter();

router.get('/check-ins/room-pets/:reservationId', getCheckInRoomPetsRoute);
router.post('/check-ins/batch', batchCheckInRoute);
router.get('/check-ins/draft/:reservationId', getCheckInDraftRoute);
router.post('/check-ins/draft', saveCheckInDraftRoute);
router.get('/check-ins', getAllCheckInsRoute);
router.post('/check-ins', createCheckInRoute);
router.get('/check-ins/:id', getCheckInByIdRoute);
router.put('/check-ins/:id', updateCheckInRoute);
router.post('/check-ins/:id/medications', addCheckInMedicationRoute);
router.put(
  '/check-ins/:checkInId/medications/:medicationId',
  updateCheckInMedicationRoute
);
router.delete(
  '/check-ins/:checkInId/medications/:medicationId',
  deleteCheckInMedicationRoute
);
router.put(
  '/check-ins/:checkInId/belongings/:belongingId/return',
  returnCheckInBelongingRoute
);

export default router;
