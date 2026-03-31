import type { Router } from 'express';
import { Router as expressRouter } from 'express';
import { getResourceById } from '../../controllers/resource/resource.controller.js';

export const route: Router = expressRouter();

route.use('/:id', getResourceById);
