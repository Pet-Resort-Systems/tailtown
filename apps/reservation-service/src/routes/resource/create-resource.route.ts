import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { createResource } from '../../controllers/resource/resource.controller.js';

export const route: Router = expressRouter();

route.use('/', createResource);
