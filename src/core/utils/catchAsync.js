// src/core/utils/catchAsync.js

export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`🚨 Error atrapado en [${req.method}] ${req.originalUrl}:`, err);
      
      // 🛡️ MAGIA: Interceptamos el error de duplicados (Cédulas repetidas) GLOBALMENTE
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Error: El documento o dato que intentas registrar ya existe y pertenece a otro registro en el sistema.'
        });
      }

      // Si es otro error, lanzamos el 500 estándar
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: err.message || err
      });
    });
  };
};