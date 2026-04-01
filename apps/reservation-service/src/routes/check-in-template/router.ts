import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { route as cloneCheckInTemplateRoute } from './clone-check-in-template.route.js';
import { route as createCheckInTemplateRoute } from './create-check-in-template.route.js';
import { route as deleteCheckInTemplateRoute } from './delete-check-in-template.route.js';
import { route as getAllCheckInTemplatesRoute } from './get-all-check-in-templates.route.js';
import { route as getCheckInTemplateByIdRoute } from './get-check-in-template-by-id.route.js';
import { route as getDefaultCheckInTemplateRoute } from './get-default-check-in-template.route.js';
import { route as updateCheckInTemplateRoute } from './update-check-in-template.route.js';

const router: Router = expressRouter();

router.get('/check-in-templates', getAllCheckInTemplatesRoute);
router.get('/check-in-templates/default', getDefaultCheckInTemplateRoute);
router.get('/check-in-templates/:id', getCheckInTemplateByIdRoute);
router.post('/check-in-templates', createCheckInTemplateRoute);
router.put('/check-in-templates/:id', updateCheckInTemplateRoute);
router.delete('/check-in-templates/:id', deleteCheckInTemplateRoute);
router.post('/check-in-templates/:id/clone', cloneCheckInTemplateRoute);

export default router;
