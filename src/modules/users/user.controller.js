import User from './user.model.js';
import bcrypt from 'bcryptjs';

export const createUser = async (req, res) => {
  try {
    const userData = req.body;

    if (!userData.password) {
      return res.status(400).json({ success: false, message: 'La contraseña es obligatoria' });
    }

    // 👇 MAPEO: Convertimos el 'estado' del frontend a 'estado_activa' de la BD
    if (userData.estado !== undefined) {
      userData.estado_activa = userData.estado;
    }

    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(userData.password, salt);

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    savedUser.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: savedUser
    });

  } catch (error) {
    // 👇 MANEJO DE ERROR ESPECÍFICO: Si la cédula ya existe
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya existe un usuario registrado con esta cédula' 
      });
    }
    res.status(400).json({
      success: false,
      message: 'Error al crear el usuario',
      error: error.message
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    // 👇 CORRECCIÓN: Quitamos el filtro { estado_activa: true } 
    // Para que el Admin pueda ver también a las inactivas en la tabla
    const users = await User.find({}).select('-password');
    
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener los usuarios', error: error.message });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const userToUpdate = await User.findById(id);
    
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const requesterId = req.user?.id || req.user?._id || req.user?.userId; 
    
    if (userToUpdate.rol_sistema === 'ADMIN' && String(requesterId) !== String(id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso Denegado: No tienes permisos para modificar las credenciales de otro Administrador.' 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

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
    let updateData = { ...req.body };

    delete updateData.password;

    // 👇 ESCUDO DE SEGURIDAD PARA AUTO-EDICIÓN 👇
    // Si el usuario que hace la petición NO es ADMIN, le bloqueamos los campos críticos
    const userRole = req.user?.rol_sistema || req.user?.rol;
    
    if (userRole !== 'ADMIN') {
      delete updateData.rol_sistema;
      delete updateData.tipo_empleada;
      delete updateData.estado;
      delete updateData.estado_activa;
      delete updateData.cedula; // La cédula no se cambia sola
    }
    // 👆 ========================================== 👆

    // 👇 MAPEO para cuando edites a una empleada (solo si 'estado' superó el escudo anterior)
    if (updateData.estado !== undefined) {
      updateData.estado_activa = updateData.estado;
    }

    const userActualizado = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
    
    if (!userActualizado) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Usuario actualizado correctamente',
      data: userActualizado 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Esta cédula ya está siendo usada por otro usuario' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: error.message });
  }
};