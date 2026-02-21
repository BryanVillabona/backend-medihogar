import { Router } from 'express';
import { createUser, getUsers } from './user.controller.js';
import { verifyToken, verifyAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { createUserSchema } from './user.schema.js';

const router = Router();

// Solo un ADMIN logueado puede crear usuarios, y los datos deben ser válidos
router.post('/', verifyToken, verifyAdmin, validateSchema(createUserSchema), createUser);

// Solo listamos usuarios si estás logueado y eres ADMIN (las empleadas no necesitan ver la lista de personal)
router.get('/', verifyToken, verifyAdmin, getUsers);

export default router;