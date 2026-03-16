import { Router } from 'express';
import { login, refreshToken } from './auth.controller.js'; // 👈 NUEVO: Importamos refreshToken
import { validateSchema } from '../../core/middlewares/validate.middleware.js';
import { loginSchema } from './auth.schema.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// 👇 NUEVO: Configuramos el escudo Anti-Fuerza Bruta 👇
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Tiempo de castigo: 15 minutos
  max: 50, // Límite: 5 intentos máximos por IP en esos 15 minutos
  message: { 
    success: false, 
    message: 'Demasiados intentos. Por seguridad, intente nuevamente en 15 minutos.' 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});
// 👆 ============================================== 👆

// Añadimos el "loginLimiter" justo antes de que se valide el esquema y se intente hacer el login
router.post('/login', loginLimiter, validateSchema(loginSchema), login);

// 🌟 NUEVO: Endpoint para la rotación silenciosa de tokens (no lleva rateLimit estricto)
router.post('/refresh', refreshToken);

export default router;