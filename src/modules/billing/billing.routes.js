import { Router } from 'express';
import { calculateEmployeePayroll } from './billing.controller.js';
import { registerPayment } from './payment.controller.js';
// 1. Importamos el Guardián
import { verifyToken } from '../../core/middlewares/auth.middleware.js';

const router = Router();

// 2. Protegemos las rutas
router.get('/payroll/:empleadaId', verifyToken, calculateEmployeePayroll);
router.post('/payments', verifyToken, registerPayment);

export default router;