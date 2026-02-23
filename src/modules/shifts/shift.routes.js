import { Router } from 'express';
import { createShift, getShifts, cancelShift, completeShift, updateShift } from './shift.controller.js';
import { verifyToken, verifyAdmin } from '../../core/middlewares/auth.middleware.js';

// Importamos el validador y el esquema
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { createShiftSchema } from './shift.schema.js';

const router = Router();

// Cadena de seguridad: 
// 1. ¿Tienes Token? (verifyToken)
// 2. ¿Eres Admin? (verifyAdmin)
// 3. ¿Los datos son perfectos? (validateSchema)
// 4. Crea el turno (createShift)
router.post('/', verifyToken, verifyAdmin, validateSchema(createShiftSchema), createShift);

// Para ver los turnos, solo necesitas estar logueado (No validamos body porque es un GET)
router.get('/', verifyToken, getShifts);

router.patch('/:id/cancel', verifyToken, verifyAdmin, cancelShift);

router.put('/:id/complete', completeShift);

router.put('/:id', updateShift);

export default router;