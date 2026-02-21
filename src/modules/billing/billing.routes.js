import { Router } from 'express';
import { calculateEmployeePayroll } from './billing.controller.js';
import { registerPayment } from './payment.controller.js';
import { verifyToken, verifyAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { registerPaymentSchema } from './payment.schema.js';

const router = Router();

// Solo el ADMIN liquida nómina y registra abonos de clientes
router.get('/payroll/:empleadaId', verifyToken, verifyAdmin, calculateEmployeePayroll);
router.post('/payments', verifyToken, verifyAdmin, validateSchema(registerPaymentSchema), registerPayment);

export default router;