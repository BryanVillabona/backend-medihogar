// Este middleware recibe un "schema" de Zod como parámetro
export const validateSchema = (schema) => (req, res, next) => {
  try {
    // Intenta validar el cuerpo de la petición contra el esquema
    schema.parse(req.body);
    next(); // Si todo está perfecto, avanza al controlador
  } catch (error) {
    // Si falla, mapeamos los errores para decirle al frontend exactamente qué campo está mal
    return res.status(400).json({
      success: false,
      message: 'Error de validación de datos',
      errors: error.errors.map(err => ({
        campo: err.path[0],
        mensaje: err.message
      }))
    });
  }
};