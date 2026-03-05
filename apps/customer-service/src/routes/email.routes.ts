import { Router } from 'express';
import { emailController } from '../controllers/email.controller';

const router = Router();

// Get email configuration status
router.get('/config', (req, res, next) => emailController.getEmailConfig(req, res, next));

// Send test email
router.post('/test', (req, res, next) => emailController.sendTestEmail(req, res, next));

// Send reservation confirmation
router.post('/reservation-confirmation/:reservationId', (req, res, next) => 
  emailController.sendReservationConfirmation(req, res, next)
);

// Send reservation reminder
router.post('/reservation-reminder/:reservationId', (req, res, next) => 
  emailController.sendReservationReminder(req, res, next)
);

// Send welcome email
router.post('/welcome/:customerId', (req, res, next) => 
  emailController.sendWelcomeEmail(req, res, next)
);

export default router;
