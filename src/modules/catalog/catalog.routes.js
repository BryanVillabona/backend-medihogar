import { Router } from 'express';
import { createService, getActiveServices } from './catalog.controller.js';
// 1. Importamos el middleware de seguridad
import { verifyToken } from '../../core/middlewares/auth.middleware.js';

const router = Router();

// 2. Protegemos ambas rutas
router.post('/', verifyToken, createService);
router.get('/', verifyToken, getActiveServices);

export default router;