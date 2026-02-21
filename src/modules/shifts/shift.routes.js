import { Router } from 'express';
import { createShift, getShifts } from './shift.controller.js';
// 1. Importamos el Guardián
import { verifyToken } from '../../core/middlewares/auth.middleware.js';

const router = Router();

// 2. Colocamos el Guardián como segundo parámetro
// Si verifyToken falla, la petición muere ahí y nunca llega a createShift
router.post('/', verifyToken, createShift);
router.get('/', verifyToken, getShifts);

export default router;