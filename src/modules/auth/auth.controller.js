import User from '../users/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 🌟 NUEVO: Función auxiliar para generar ambos tokens
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    rol: user.rol_sistema 
  };

  // 1. Access Token: Corta vida (15 minutos). Es el que viaja en cada petición.
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  
  // 2. Refresh Token: Larga vida (7 días). Solo sirve para pedir un nuevo Access Token.
  // (Usa la misma clave secreta por simplicidad, aunque en sistemas gigantes se usa una diferente)
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  return { token, refreshToken };
};

export const login = async (req, res) => {
  try {
    const { cedula, password } = req.body;

    const user = await User.findOne({ cedula }).select('+password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 👇 CORRECCIÓN: Validamos contra 'estado_activa'
    if (user.estado_activa === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Este usuario se encuentra inactivo en el sistema.' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 🌟 Generamos ambos tokens
    const { token, refreshToken } = generateTokens(user);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,          // Access Token (15m)
      refreshToken,   // Refresh Token (7d)
      user: {
        _id: user._id,                   
        cedula: user.cedula,             
        nombre: user.nombre_completo,  
        rol: user.rol_sistema          
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
};

// 🌟 NUEVO ENDPOINT: Generador de nuevos tokens silenciosos
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh Token requerido' });
    }

    // Verificamos si el Refresh Token es válido y no ha expirado
    jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Refresh Token inválido o expirado. Inicie sesión nuevamente.' });
      }

      // Buscamos al usuario para asegurarnos de que NO lo hayan borrado o desactivado
      // mientras el token seguía vivo
      const user = await User.findById(decoded.id);
      
      if (!user || user.estado_activa === false) {
        return res.status(403).json({ success: false, message: 'Usuario inactivo o eliminado' });
      }

      // Rotación de tokens: Entregamos un par de tokens totalmente nuevos
      const tokens = generateTokens(user);

      res.status(200).json({
        success: true,
        token: tokens.token,
        refreshToken: tokens.refreshToken
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al renovar el token', error: error.message });
  }
};