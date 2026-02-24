import { Router } from 'express';
import { login } from './auth.controller.js';
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { loginSchema } from './auth.schema.js';
import rateLimit from 'express-rate-limit'; // <-- NUEVO: Importamos el limitador

const router = Router();

// 👇 NUEVO: Configuramos el escudo Anti-Fuerza Bruta 👇
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Tiempo de castigo: 15 minutos
  max: 5, // Límite: 5 intentos máximos por IP en esos 15 minutos
  message: { 
    success: false, 
    message: 'Demasiados intentos fallidos. Por seguridad, intente nuevamente en 15 minutos.' 
  },
  standardHeaders: true, // Retorna la info del límite en los headers estándar
  legacyHeaders: false, // Deshabilita los headers antiguos
});
// 👆 ============================================== 👆

// Añadimos el "loginLimiter" justo antes de que se valide el esquema y se intente hacer el login
router.post('/login', loginLimiter, validateSchema(loginSchema), login);

export default router;