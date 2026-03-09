/**
 * Waitlist Routes
 * 
 * API routes for waitlist management
 */

import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as waitlistController from '../controllers/waitlist.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Customer-facing routes
router.post('/', waitlistController.addToWaitlist);
router.get('/my-entries', waitlistController.getMyWaitlistEntries);
router.delete('/:id', waitlistController.removeFromWaitlist);
router.get('/:id/position', waitlistController.getWaitlistPosition);

// Staff-facing routes
router.get('/', waitlistController.listWaitlistEntries);
router.patch('/:id', waitlistController.updateWaitlistEntry);
router.post('/:id/convert', waitlistController.convertToReservation);

// System routes
router.post('/check-availability', waitlistController.checkAvailability);

export default router;
