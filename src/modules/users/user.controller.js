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

// Controlador para resetear/cambiar contraseñas (CON PROTECCIÓN ANTI-ESCALADA)
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // 1. Buscar al usuario que se quiere modificar antes de hacer ningún cambio
    const userToUpdate = await User.findById(id);
    
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // 2. REGLA DE ORO DE SEGURIDAD: Un Admin no puede tocar a otro Admin.
    // Usamos el ID del usuario logueado que viene del middleware (req.user)
    const requesterId = req.user?.id || req.user?._id || req.user?.userId; 
    
    // CORRECCIÓN: Convertimos ambos a String() para evitar conflictos de tipo ObjectId vs String
    if (userToUpdate.rol_sistema === 'ADMIN' && String(requesterId) !== String(id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso Denegado: No tienes permisos para modificar las credenciales de otro Administrador.' 
      });
    }

    // 3. Si pasa el filtro de seguridad, procedemos a encriptar la nueva clave
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Guardamos la nueva contraseña
    userToUpdate.password = hashedPassword;
    await userToUpdate.save();

    res.status(200).json({ success: true, message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar contraseña', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Por seguridad, si alguien intenta enviar una contraseña por aquí, la ignoramos.
    // (Para eso está tu función dedicada de resetPassword que ya creamos)
    delete updateData.password;

    const userActualizado = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    if (!userActualizado) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Usuario actualizado correctamente',
      data: userActualizado 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: error.message });
  }
};