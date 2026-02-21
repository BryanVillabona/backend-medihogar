import jwt from 'jsonwebtoken';

// 1. Guardián General (Verifica si estás logueado)
export const verifyToken = (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token) {
      // Cambiamos a 401 (No Autorizado) en lugar de 403
      return res.status(401).json({ success: false, message: 'No se proporcionó un token de seguridad' });
    }

    token = token.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    // 401 para token inválido o expirado
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

// 2. NUEVO: Guardián de Administrador (Verifica si eres el jefe)
export const verifyAdmin = (req, res, next) => {
  // Primero comprobamos que el usuario exista en la request (que haya pasado por verifyToken)
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  // Si el rol no es ADMIN, lanzamos un 403 (Prohibido: Sabes quién soy, pero no tengo permiso)
  if (req.user.rol !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Se requieren permisos de Administrador.' });
  }

  next(); // Si es ADMIN, lo dejamos pasar
};