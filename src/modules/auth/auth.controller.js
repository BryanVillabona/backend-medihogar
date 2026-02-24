import User from '../users/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  try {
    const { cedula, password } = req.body;

    // 1. Verificar si el usuario existe
    const user = await User.findOne({ cedula });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (user.estado === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Este usuario se encuentra inactivo en el sistema.' 
      });
    }

    // 2. Verificar la contraseña encriptada
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 3. Generar el JWT (El "Carnet" digital)
    const payload = {
      id: user._id,
      rol: user.rol_sistema 
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // LA SOLUCIÓN: Enviamos TODOS los datos clave al frontend
    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        _id: user._id,                   
        cedula: user.cedula,             
        nombre: user.nombre_completo,  // <-- VOLVEMOS A LLAMARLO "nombre"
        rol: user.rol_sistema          // <-- VOLVEMOS A LLAMARLO "rol"
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
};