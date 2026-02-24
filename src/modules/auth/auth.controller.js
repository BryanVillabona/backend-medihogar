import User from '../users/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  try {
    const { cedula, password } = req.body;

    const user = await User.findOne({ cedula });
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

    const payload = {
      id: user._id,
      rol: user.rol_sistema 
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
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