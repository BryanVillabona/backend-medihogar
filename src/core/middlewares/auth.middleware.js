import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    // El token viaja en los Headers bajo la llave 'Authorization'
    let token = req.headers.authorization;

    if (!token) {
      return res.status(403).json({ success: false, message: 'No se proporcionó un token de seguridad' });
    }

    // El formato estándar es "Bearer <token>", así que lo separamos
    token = token.split(' ')[1];

    // Verificamos si el token es válido y no ha expirado
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Inyectamos los datos del usuario en la petición para que el siguiente controlador sepa quién es
    req.user = decoded;
    
    // Le decimos a Express que puede continuar hacia el controlador
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};