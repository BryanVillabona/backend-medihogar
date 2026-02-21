import { Router } from 'express';
import { createService, getActiveServices } from './catalog.controller.js';
import { verifyToken, verifyAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { createServiceSchema } from './catalog.schema.js';

const router = Router();

// Solo el ADMIN puede crear nuevas tarifas
router.post('/', verifyToken, verifyAdmin, validateSchema(createServiceSchema), createService);

// Cualquiera logueado puede ver las tarifas (para los dropdowns)
router.get('/', verifyToken, getActiveServices);

export default router;