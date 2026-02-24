import { Router } from 'express';
import { createClient, getActiveClients, updateClient } from './client.controller.js';
import { verifyToken, verifyAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { createClientSchema } from './client.schema.js';

const router = Router();

// Protegido: Solo Admin registra clientes
router.post('/', verifyToken, verifyAdmin, validateSchema(createClientSchema), createClient);
router.get('/', verifyToken, getActiveClients);
router.put('/:id', verifyToken, checkRole(['ADMIN']), updateClient);

export default router;