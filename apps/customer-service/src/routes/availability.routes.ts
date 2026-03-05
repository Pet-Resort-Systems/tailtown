import express from 'express';
import {
  checkAvailability,
  getAvailabilityCalendar,
  getSuiteAvailability,
  getAlternativeDates,
  batchCheckAvailability
} from '../controllers/availability.controller';

const router = express.Router();

router.post('/check', checkAvailability);
router.get('/calendar', getAvailabilityCalendar);
router.get('/suite/:suiteId', getSuiteAvailability);
router.post('/alternatives', getAlternativeDates);
router.post('/batch', batchCheckAvailability);

export default router;
