import { Router } from 'express';
import { vaccineUploadController } from '../controllers/vaccine-upload.controller';
import { uploadVaccineRecord } from '../services/upload.service';

const router = Router();

// Upload vaccine record for a pet
router.post('/:petId/vaccine-records/upload', 
  uploadVaccineRecord.single('file'),
  (req, res, next) => vaccineUploadController.uploadVaccineRecord(req, res, next)
);

// Get all vaccine records for a pet
router.get('/:petId/vaccine-records', 
  (req, res, next) => vaccineUploadController.getVaccineRecords(req, res, next)
);

// Download a specific vaccine record
router.get('/:petId/vaccine-records/:filename/download', 
  (req, res, next) => vaccineUploadController.downloadVaccineRecord(req, res, next)
);

// Delete a vaccine record
router.delete('/:petId/vaccine-records/:filename', 
  (req, res, next) => vaccineUploadController.deleteVaccineRecord(req, res, next)
);

export default router;
