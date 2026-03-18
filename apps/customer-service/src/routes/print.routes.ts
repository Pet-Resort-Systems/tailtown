import { Router } from 'express';
import {
  printKennelLabel,
  getAvailablePrinters,
  getPrinterStatus,
} from '../controllers/print.controller';

const router = Router();

// Print a kennel label
router.post('/kennel-label', printKennelLabel);

// Get list of available printers
router.get('/printers', getAvailablePrinters);

// Get printer status
router.get('/printers/:printerName/status', getPrinterStatus);

export default router;
