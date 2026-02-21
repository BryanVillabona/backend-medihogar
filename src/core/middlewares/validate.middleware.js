import { ZodError } from 'zod';

export const validateSchema = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    // 1. Si es un error de validación de Zod, respondemos con 400
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación de datos',
        // ¡El cambio clave está aquí! Usamos error.issues
        errors: error.issues.map(issue => ({
          // path es un array, lo unimos. Si viene vacío, indicamos 'cuerpo_peticion'
          campo: issue.path.join('.') || 'cuerpo_peticion',
          mensaje: issue.message
        }))
      });
    }

    // 2. Si es otro tipo de error, lo atrapamos y logueamos
    console.error("🚨 Error crítico en middleware de validación:", error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al validar',
      error: error.message
    });
  }
};