import { Router } from 'express';
// 1. Importamos las funciones propias de billing (Nómina, Facturas y PAGO A EMPLEADAS)
import { calculateEmployeePayroll, generateClientStatement, getGlobalReport, payEmployee } from './billing.controller.js';
// 2. Importamos la función de pagos de clientes
import { registerPayment } from './payment.controller.js';
// 3. Importamos las novedades desde el módulo de payroll
import { registerPayrollAdjustment } from '../payroll/payroll.controller.js';

// Middlewares
import { verifyToken, verifyAdmin } from '../../core/middlewares/auth.middleware.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { registerPaymentSchema } from './payment.schema.js';

const router = Router();

// ==========================================
// RUTAS DE NÓMINA (EGRESOS)
// ==========================================
// Liquidar nómina (Visualizar)
router.get('/payroll/:empleadaId', verifyToken, verifyAdmin, calculateEmployeePayroll);

// 👇 NUEVO: Ejecutar el pago de nómina
router.post('/pay-employee', verifyToken, verifyAdmin, payEmployee);

// Registrar un bono o préstamo (viene de payroll.controller.js)
router.post('/adjustments', verifyToken, verifyAdmin, registerPayrollAdjustment);


// ==========================================
// RUTAS DE CLIENTES (INGRESOS)
// ==========================================
// Generar estado de cuenta (factura del mes)
router.get('/statement/:clienteId', verifyToken, verifyAdmin, generateClientStatement);

// Registrar un pago/abono de cliente
router.post('/payments', verifyToken, verifyAdmin, validateSchema(registerPaymentSchema), registerPayment);

// Reporte global
router.get('/report/global', verifyToken, verifyAdmin, getGlobalReport);

export default router;