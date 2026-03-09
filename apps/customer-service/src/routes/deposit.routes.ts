import express from 'express';
import {
  getDepositConfig,
  updateDepositConfig,
  calculateDeposit,
  calculateRefund,
  validateDepositPayment,
  getDepositRules,
  createDepositRule,
  updateDepositRule,
  deleteDepositRule
} from '../controllers/deposit.controller';

const router = express.Router();

// Configuration
router.get('/config', getDepositConfig);
router.put('/config', updateDepositConfig);

// Calculations
router.post('/calculate', calculateDeposit);
router.post('/calculate-refund', calculateRefund);
router.post('/validate-payment', validateDepositPayment);

// Rules
router.get('/rules', getDepositRules);
router.post('/rules', createDepositRule);
router.put('/rules/:id', updateDepositRule);
router.delete('/rules/:id', deleteDepositRule);

export default router;
