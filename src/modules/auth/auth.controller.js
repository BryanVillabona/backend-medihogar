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

    // 2. Verificar la contraseña encriptada
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 3. Generar el JWT (El "Carnet" digital)
    // Usamos el _id y el rol para saber quién es y qué puede hacer
    const payload = {
      id: user._id,
      rol: user.rol_sistema 
    };

    // Firmamos el token con una clave secreta (que pondremos en el .env)
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        nombre: user.nombre_completo,
        rol: user.rol_sistema
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
};