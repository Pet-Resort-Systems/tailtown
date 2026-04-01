import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { route as createFeedingLogRoute } from './create-feeding-log.route.js';
import { route as createMedicationLogRoute } from './create-medication-log.route.js';
import { route as createPetMedicationRoute } from './create-pet-medication.route.js';
import { route as deletePetMedicationRoute } from './delete-pet-medication.route.js';
import { route as getCheckedInPetsRoute } from './get-checked-in-pets.route.js';
import { route as getFeedingLogsRoute } from './get-feeding-logs.route.js';
import { route as getFeedingReportRoute } from './get-feeding-report.route.js';
import { route as getMedicationLogsRoute } from './get-medication-logs.route.js';
import { route as getMedicationReportRoute } from './get-medication-report.route.js';
import { route as getPetMedicationsRoute } from './get-pet-medications.route.js';
import { route as getPetsNeedingMedicationRoute } from './get-pets-needing-medication.route.js';
import { route as togglePickyEaterRoute } from './toggle-picky-eater.route.js';
import { route as updatePetMedicationRoute } from './update-pet-medication.route.js';

const router: Router = expressRouter();

router.get('/feeding/pets', getCheckedInPetsRoute);
router.post('/feeding', createFeedingLogRoute);
router.get('/feeding/pet/:petId', getFeedingLogsRoute);
router.get('/feeding/report', getFeedingReportRoute);
router.patch('/pets/:petId/picky-eater', togglePickyEaterRoute);

router.get('/medications/pets', getPetsNeedingMedicationRoute);
router.get('/medications/pet/:petId', getPetMedicationsRoute);
router.post('/medications/pet/:petId', createPetMedicationRoute);
router.patch('/medications/:medicationId', updatePetMedicationRoute);
router.delete('/medications/:medicationId', deletePetMedicationRoute);
router.post('/medications/log', createMedicationLogRoute);
router.get('/medications/log/pet/:petId', getMedicationLogsRoute);
router.get('/medications/report', getMedicationReportRoute);

export default router;
