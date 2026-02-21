import { Router } from 'express';
import { login } from './auth.controller.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { loginSchema } from './auth.schema.js';

const router = Router();

// Validamos antes de intentar hacer el login
router.post('/login', validateSchema(loginSchema), login);

export default router;