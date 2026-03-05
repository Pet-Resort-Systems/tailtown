import { Router } from 'express';
import { smsController } from '../controllers/sms.controller';

const router = Router();

// Configuration endpoint
router.get('/config', (req, res) => smsController.getConfig(req, res));

// Test SMS endpoint
router.post('/test', (req, res) => smsController.sendTestSMS(req, res));

// Reservation-related SMS
router.post('/reservation-reminder/:reservationId', (req, res) => 
  smsController.sendReservationReminder(req, res)
);

router.post('/reservation-confirmation/:reservationId', (req, res) => 
  smsController.sendReservationConfirmation(req, res)
);

// Customer welcome message
router.post('/welcome/:customerId', (req, res) => 
  smsController.sendWelcomeMessage(req, res)
);

// Marketing messages
router.post('/marketing', (req, res) => 
  smsController.sendMarketingMessage(req, res)
);

// Check-in/Check-out notifications
router.post('/check-in/:reservationId', (req, res) => 
  smsController.sendCheckInNotification(req, res)
);

router.post('/check-out/:reservationId', (req, res) => 
  smsController.sendCheckOutNotification(req, res)
);

export default router;
