import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { route as createServiceAgreementRoute } from './create-service-agreement.route.js';
import { route as createServiceAgreementTemplateRoute } from './create-service-agreement-template.route.js';
import { route as deleteServiceAgreementTemplateRoute } from './delete-service-agreement-template.route.js';
import { route as getAllServiceAgreementTemplatesRoute } from './get-all-service-agreement-templates.route.js';
import { route as getAllServiceAgreementsRoute } from './get-all-service-agreements.route.js';
import { route as getCustomerServiceAgreementsRoute } from './get-customer-service-agreements.route.js';
import { route as getDefaultServiceAgreementTemplateRoute } from './get-default-service-agreement-template.route.js';
import { route as getServiceAgreementByCheckInIdRoute } from './get-service-agreement-by-check-in-id.route.js';
import { route as getServiceAgreementByIdRoute } from './get-service-agreement-by-id.route.js';
import { route as getServiceAgreementTemplateByIdRoute } from './get-service-agreement-template-by-id.route.js';
import { route as getServiceAgreementTemplateVersionRoute } from './get-service-agreement-template-version.route.js';
import { route as getServiceAgreementTemplateVersionsRoute } from './get-service-agreement-template-versions.route.js';
import { route as getValidCustomerServiceAgreementRoute } from './get-valid-customer-service-agreement.route.js';
import { route as invalidateServiceAgreementRoute } from './invalidate-service-agreement.route.js';
import { route as updateServiceAgreementTemplateRoute } from './update-service-agreement-template.route.js';

const router: Router = expressRouter();

router.get('/service-agreement-templates', getAllServiceAgreementTemplatesRoute);
router.get('/service-agreement-templates/default', getDefaultServiceAgreementTemplateRoute);
router.get('/service-agreement-templates/:id/versions/:version', getServiceAgreementTemplateVersionRoute);
router.get('/service-agreement-templates/:id/versions', getServiceAgreementTemplateVersionsRoute);
router.get('/service-agreement-templates/:id', getServiceAgreementTemplateByIdRoute);
router.post('/service-agreement-templates', createServiceAgreementTemplateRoute);
router.put('/service-agreement-templates/:id', updateServiceAgreementTemplateRoute);
router.delete('/service-agreement-templates/:id', deleteServiceAgreementTemplateRoute);
router.get('/service-agreements/check-in/:checkInId', getServiceAgreementByCheckInIdRoute);
router.get('/service-agreements/customer/:customerId/valid', getValidCustomerServiceAgreementRoute);
router.get('/service-agreements/customer/:customerId', getCustomerServiceAgreementsRoute);
router.get('/service-agreements/:id', getServiceAgreementByIdRoute);
router.get('/service-agreements', getAllServiceAgreementsRoute);
router.post('/service-agreements', createServiceAgreementRoute);
router.put('/service-agreements/:id/invalidate', invalidateServiceAgreementRoute);

export default router;
