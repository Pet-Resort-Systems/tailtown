/**
 * Notification Routes
 *
 * Email notification endpoints for reservation events.
 * Called by the reservation service.
 */

import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';

const router = Router();

// Reservation confirmation email
router.post('/reservation-confirmation/:reservationId', (req, res) =>
  notificationController.sendReservationConfirmation(req, res)
);

// Check-in notification email
router.post('/check-in/:reservationId', (req, res) =>
  notificationController.sendCheckInNotification(req, res)
);

// Check-out notification email
router.post('/check-out/:reservationId', (req, res) =>
  notificationController.sendCheckOutNotification(req, res)
);

// Status change notification email
router.post('/status-change/:reservationId', (req, res) =>
  notificationController.sendStatusChangeNotification(req, res)
);

// Reservation reminder email
router.post('/reminder/:reservationId', (req, res) =>
  notificationController.sendReservationReminder(req, res)
);

export default router;
