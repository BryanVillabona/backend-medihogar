import { Router } from 'express';
import { createUser, getUsers, updateUser } from './user.controller.js';
import { resetUserPassword } from './user.controller.js';
import { verifyToken, verifyAdmin, isSelfOrAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { createUserSchema } from './user.schema.js';

const router = Router();

// Solo un ADMIN logueado puede crear usuarios, y los datos deben ser válidos
router.post('/', verifyToken, verifyAdmin, validateSchema(createUserSchema), createUser);

// Solo listamos usuarios si estás logueado y eres ADMIN (las empleadas no necesitan ver la lista de personal)
router.get('/', verifyToken, verifyAdmin, getUsers);

// 👇 AQUÍ USAMOS EL NUEVO GUARDIÁN 👇
router.put('/:id/reset-password', verifyToken, isSelfOrAdmin, resetUserPassword);

// 👇 Y AQUÍ TAMBIÉN 👇
router.put('/:id', verifyToken, isSelfOrAdmin, updateUser);

export default router;