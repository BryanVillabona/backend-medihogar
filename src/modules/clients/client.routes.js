import { Router } from 'express';
import { createClient, getActiveClients } from './client.controller.js';
// 1. Importamos el middleware de seguridad
import { verifyToken } from '../../core/middlewares/auth.middleware.js';

const router = Router();

// 2. Protegemos ambas rutas
router.post('/', verifyToken, createClient);
router.get('/', verifyToken, getActiveClients);

export default router;