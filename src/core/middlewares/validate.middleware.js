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
        errors: error.errors.map(err => ({
          campo: err.path.join('.'), // Usar join es más seguro por si el path es profundo
          mensaje: err.message
        }))
      });
    }

    // 2. Si es otro tipo de error (ej. schema undefined), lo atrapamos y logueamos
    console.error("🚨 Error crítico en middleware de validación:", error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al validar',
      error: error.message
    });
  }
};