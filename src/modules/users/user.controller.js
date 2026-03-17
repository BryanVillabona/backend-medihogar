import User from './user.model.js';
import bcrypt from 'bcryptjs';

// 👇 NUEVO: Importamos los modelos financieros para calcular la deuda en tiempo real
import Shift from '../shifts/shift.model.js';
import PayrollAdjustment from '../payroll/payrollAdjustment.model.js';

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

// =========================================================================
// OBTENER USUARIOS (AHORA CON CÁLCULO DE DEUDA EN TIEMPO REAL)
// =========================================================================
export const getUsers = async (req, res) => {
  try {
    // Usamos .lean() para que Mongoose nos devuelva objetos puros de JS y poder inyectarles la deuda
    const users = await User.find({}).select('-password').lean();
    
    // 🌟 FIX: Buscamos deudas activas, pero EXCLUIMOS ROTUNDAMENTE los turnos CANCELADOS
    const pendingShifts = await Shift.find({ 
      estado_pago_empleada: 'PENDIENTE',
      estado_turno: { $ne: 'CANCELADO' } // <--- EL ESCUDO ANTI-ZOMBIES
    }).lean();
    
    const pendingAdjustments = await PayrollAdjustment.find({ estado: 'PENDIENTE' }).lean();

    // Cruzamos la información
    const usersWithDebt = users.map(user => {
      const userId = user._id.toString();
      let deuda_actual = 0;

      // 1. Sumar turnos no pagados (usamos costo_pagado que es la variable oficial)
      pendingShifts.forEach(turno => {
        if (turno.empleada_id?.toString() === userId) {
          deuda_actual += (turno.costo_pagado || 0);
        }
      });

      // 2. Sumar bonos o restar préstamos pendientes
      pendingAdjustments.forEach(ajuste => {
        if (ajuste.empleada_id?.toString() === userId) {
          if (ajuste.tipo_movimiento === 'INGRESO') deuda_actual += ajuste.monto;
          if (ajuste.tipo_movimiento === 'EGRESO') deuda_actual -= ajuste.monto;
        }
      });

      // Evitar saldos negativos confusos
      if (deuda_actual < 0) deuda_actual = 0;

      // Retornamos el usuario con su nuevo atributo 'deuda_actual'
      return {
        ...user,
        deuda_actual
      };
    });

    res.status(200).json({
      success: true,
      data: usersWithDebt
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
    const userRole = req.user?.rol_sistema || req.user?.rol;
    
    if (userRole !== 'ADMIN') {
      delete updateData.rol_sistema;
      delete updateData.tipo_empleada;
      delete updateData.estado;
      delete updateData.estado_activa;
      delete updateData.cedula; // La cédula no se cambia sola
    }
    // 👆 ========================================== 👆

    // 👇 MAPEO para cuando edites a una empleada
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