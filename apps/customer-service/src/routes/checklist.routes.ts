import express from 'express';
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  startChecklist,
  getChecklistInstance,
  updateChecklistItem,
  completeChecklist,
  getAllInstances,
  getChecklistStats
} from '../controllers/checklist.controller';

const router = express.Router();

// Templates
router.get('/templates', getAllTemplates);
router.get('/templates/:id', getTemplateById);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// Instances
router.post('/start', startChecklist);
router.get('/instances', getAllInstances);
router.get('/instances/:id', getChecklistInstance);
router.put('/instances/:id/item', updateChecklistItem);
router.post('/instances/:id/complete', completeChecklist);

// Stats
router.get('/stats', getChecklistStats);

export default router;
