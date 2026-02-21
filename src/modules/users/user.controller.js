import User from './user.model.js';
import bcrypt from 'bcryptjs';

// Controlador para crear un nuevo usuario/empleada
export const createUser = async (req, res) => {
  try {
    const userData = req.body;

    // Validamos que nos envíen una contraseña
    if (!userData.password) {
      return res.status(400).json({ success: false, message: 'La contraseña es obligatoria' });
    }

    // Encriptamos la contraseña (el nivel 10 de "salt" es el estándar de la industria)
    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(userData.password, salt);

    // Guardamos en Mongoose
    const newUser = new User(userData);
    const savedUser = await newUser.save();

    // Borramos la contraseña del objeto de respuesta para no exponer el hash al frontend
    savedUser.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: savedUser
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al crear el usuario',
      error: error.message
    });
  }
};

// Controlador para obtener todos los usuarios activos
export const getUsers = async (req, res) => {
  try {
    // .select('-password') le dice a MongoDB: "tráeme todo menos el campo password"
    const users = await User.find({ estado_activa: true }).select('-password');
    
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener los usuarios',
      error: error.message
    });
  }
};