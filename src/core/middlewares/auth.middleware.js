import jwt from 'jsonwebtoken';
import User from '../../modules/users/user.model.js'; // <-- NUEVO: Importamos el modelo de Usuario

// 1. Guardián General (Verifica si estás logueado y ACTIVO)
export const verifyToken = async (req, res, next) => { 
  try {
    let token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No se proporcionó un token de seguridad' });
    }

    token = token.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 👇 NUEVO ESCUDO: VERIFICAR SI LA EMPLEADA FUE DESPEDIDA/INACTIVADA 👇
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'El usuario ya no existe en el sistema' });
    }
    
    if (user.estado_activa === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso revocado por el administrador. Su cuenta está inactiva.' 
      });
    }
    // 👆 ============================================================== 👆

    req.user = decoded; 
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

// 2. NUEVO: Guardián de Administrador (Verifica si eres el jefe)
export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  // 🌟 FIX: Reconocemos la jerarquía de los 3 niveles de administradoras 🌟
  const adminRoles = ['ADMIN', 'ADMIN_FINANZAS', 'ADMIN_TURNOS'];
  
  if (!adminRoles.includes(req.user.rol)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Se requieren permisos de Administrador.' });
  }

  next(); // Si es alguna de las 3 admins, la dejamos pasar
};

// 👇 NUEVO GUARDIA: Permite el paso si es ADMIN o si es el dueño de la cuenta 👇
export const isSelfOrAdmin = (req, res, next) => {
  try {
    const targetId = req.params.id; // El ID del usuario que se va a editar
    const userId = req.user.id || req.user._id; // El ID del usuario logueado
    const userRole = req.user.rol_sistema || req.user.rol; // El rol del usuario logueado

    // 🌟 FIX: Cualquier administradora o el dueño de la cuenta puede pasar 🌟
    // (Recuerda que luego el user.controller.js bloqueará lo que no deben editar)
    const adminRoles = ['ADMIN', 'ADMIN_FINANZAS', 'ADMIN_TURNOS'];

    if (adminRoles.includes(userRole) || String(userId) === String(targetId)) {
      next();
    } else {
      return res.status(403).json({ message: 'Acceso denegado. Solo puedes modificar tu propia cuenta.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error de autorización en el servidor.' });
  }
};
// 👆 ========================================================================= 👆