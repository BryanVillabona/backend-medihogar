import jwt from 'jsonwebtoken';
import User from '../../modules/users/user.model.js'; // <-- NUEVO: Importamos el modelo de Usuario

// 1. Guardián General (Verifica si estás logueado y ACTIVO)
export const verifyToken = async (req, res, next) => { // <-- CAMBIO: Ahora es async
  try {
    let token = req.headers.authorization;

    if (!token) {
      // Cambiamos a 401 (No Autorizado) en lugar de 403
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

// 👇 NUEVO GUARDIA: Permite el paso si es ADMIN o si es el dueño de la cuenta 👇
export const isSelfOrAdmin = (req, res, next) => {
  try {
    const targetId = req.params.id; // El ID del usuario que se va a editar (viene en la URL)
    const userId = req.user.id || req.user._id; // El ID del usuario que está logueado
    const userRole = req.user.rol_sistema || req.user.rol; // El rol del usuario logueado

    // Si es ADMIN o si el ID logueado coincide con el ID que se quiere editar, lo dejamos pasar
    if (userRole === 'ADMIN' || String(userId) === String(targetId)) {
      next();
    } else {
      return res.status(403).json({ message: 'Acceso denegado. Solo puedes modificar tu propia cuenta.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error de autorización en el servidor.' });
  }
};
// 👆 ========================================================================= 👆