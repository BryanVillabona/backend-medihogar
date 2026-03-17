import mongoose from 'mongoose'; // 👈 Necesario para las transacciones
import Shift from './shift.model.js';
import User from '../users/user.model.js';
import Catalog from '../catalog/catalog.model.js';
import Client from '../clients/client.model.js';
import { catchAsync } from '../../core/utils/catchAsync.js'; // 👈 Tu nuevo limpiador de errores

export const createShift = catchAsync(async (req, res) => {
  // 🌟 FIX 1: Recibimos precio_cobrado y costo_pagado EXACTAMENTE como los envía el Frontend (SIN EL _CUSTOM)
  const { 
    cliente_id, paciente_id, empleada_id, fecha_servicio, jornada, duracion_horas, 
    novedades, rol_ejercido, precio_cobrado, costo_pagado 
  } = req.body;

  const empleada = await User.findById(empleada_id);
  if (!empleada) {
    return res.status(404).json({ success: false, message: 'Empleada no encontrada' });
  }

  const tarifa = await Catalog.findOne({
    rol_requerido: rol_ejercido,
    duracion_horas: duracion_horas,
    estado: true
  });

  // 🌟 FIX 2: Usamos las variables sin el "_custom"
  if (!tarifa && (!precio_cobrado || !costo_pagado)) {
    return res.status(400).json({ 
      success: false, 
      message: `No existe tarifa base para duración de ${duracion_horas}h. Debe ingresar los precios manualmente.` 
    });
  }

  // 🌟 FIX 3: Prioridad absoluta a lo que envía el usuario (Frontend). 
  const precioFinalCliente = precio_cobrado || (tarifa ? tarifa.precio_cobrado_cliente : null);
  const costoFinalEmpleada = costo_pagado || (tarifa ? tarifa.costo_pagado_empleada : null);

  const nuevoTurno = new Shift({
    cliente_id, paciente_id, empleada_id, fecha_servicio, jornada, duracion_horas,
    rol_ejercido, precio_cobrado: precioFinalCliente, costo_pagado: costoFinalEmpleada,
    estado_pago_empleada: 'PENDIENTE', novedades
  });

  const turnoGuardado = await nuevoTurno.save();

  const io = req.app.get('io');
  if (io) {
    io.to('room_admins').to(`room_empleada_${empleada_id}`).emit('refresh_shifts', { 
      mensaje: 'Nuevo turno programado', empleada_id: empleada_id
    });
  }

  res.status(201).json({
    success: true, message: 'Turno programado correctamente', data: turnoGuardado
  });
});

export const completeShift = catchAsync(async (req, res) => {
  const { id } = req.params;

  const shift = await Shift.findById(id);
  if (!shift) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
  if (shift.estado_turno === 'FINALIZADO') {
    return res.status(400).json({ success: false, message: 'El turno ya estaba finalizado' });
  }

  // 🌟 PROTECCIÓN ACID: El turno y la deuda del cliente se guardan en bloque
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    shift.estado_turno = 'FINALIZADO';
    await shift.save({ session }); // Vinculado a la transacción

    await Client.findByIdAndUpdate(shift.cliente_id, {
      $inc: { saldo_pendiente: shift.precio_cobrado }
    }, { session }); // Vinculado a la transacción

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error; // El catchAsync lo atrapará y mostrará el 500
  } finally {
    session.endSession();
  }

  const io = req.app.get('io');
  if (io) {
    io.to('room_admins').to(`room_empleada_${shift.empleada_id.toString()}`).emit('refresh_shifts', { 
      mensaje: 'Un turno ha sido finalizado', empleada_id: shift.empleada_id.toString()
    });
  }

  res.status(200).json({
    success: true, message: 'Turno finalizado. Cartera del cliente actualizada.', data: shift
  });
});

export const getShifts = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const filtro = req.user.rol === 'ADMIN' ? {} : { empleada_id: req.user._id || req.user.id };

  if (startDate && endDate) {
    filtro.fecha_servicio = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const turnos = await Shift.find(filtro)
    .populate('cliente_id', 'nombre_responsable pacientes') 
    .populate('empleada_id', 'nombre_completo tipo_empleada')
    .sort({ fecha_servicio: 1 });
    
  const turnosFormateados = turnos.map(turno => {
    const turnoObj = turno.toObject();

    if (turnoObj.cliente_id && turnoObj.cliente_id.pacientes) {
      const pacienteEspecifico = turnoObj.cliente_id.pacientes.find(
        p => p._id.toString() === turnoObj.paciente_id.toString()
      );

      if (pacienteEspecifico) {
        turnoObj.cliente_id.nombre_paciente = pacienteEspecifico.nombre_paciente;
        turnoObj.cliente_id.direccion_servicio = pacienteEspecifico.direccion_servicio;
      } else {
        turnoObj.cliente_id.nombre_paciente = 'Paciente Inactivo/Eliminado';
        turnoObj.cliente_id.direccion_servicio = 'Sin dirección';
      }
      delete turnoObj.cliente_id.pacientes;
    }
    return turnoObj;
  });

  res.status(200).json({ success: true, data: turnosFormateados });
});

export const cancelShift = catchAsync(async (req, res) => {
  const { id } = req.params;

  const shift = await Shift.findById(id);
  if (!shift) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
  if (shift.estado_turno === 'CANCELADO') return res.status(400).json({ success: false, message: 'El turno ya se encuentra cancelado' });
  if (shift.estado_turno === 'FINALIZADO') return res.status(400).json({ success: false, message: 'No se puede cancelar un turno que ya finalizó' });

  // 🌟 PROTECCIÓN ACID: El turno y la reversión de deuda del cliente se guardan en bloque
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    shift.estado_turno = 'CANCELADO';
    await shift.save({ session });

    await Client.findByIdAndUpdate(shift.cliente_id, {
      $inc: { saldo_pendiente: -shift.precio_cobrado }
    }, { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  const io = req.app.get('io');
  if (io) {
    io.to('room_admins').to(`room_empleada_${shift.empleada_id.toString()}`).emit('refresh_shifts', { 
      mensaje: 'Un turno ha sido cancelado', empleada_id: shift.empleada_id.toString()
    });
  }

  res.status(200).json({ success: true, message: 'Turno cancelado. El saldo del cliente ha sido ajustado.' });
});

export const updateShift = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actualizaciones = req.body; 

  const turno = await Shift.findById(id);
  if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado' });

  if (turno.estado_turno === 'FINALIZADO' || turno.estado_turno === 'CANCELADO') {
    return res.status(400).json({ 
      success: false, 
      message: 'No se puede editar un turno que ya fue finalizado o cancelado. Debe hacer un ajuste manual.' 
    });
  }

  const turnoActualizado = await Shift.findByIdAndUpdate(
    id, { $set: actualizaciones }, { new: true, runValidators: true }
  );

  const io = req.app.get('io');
  if (io) {
    io.to('room_admins').to(`room_empleada_${turnoActualizado.empleada_id.toString()}`).emit('refresh_shifts', { 
      mensaje: 'Un turno ha sido modificado', empleada_id: turnoActualizado.empleada_id.toString()
    });
  }

  res.status(200).json({ success: true, message: 'Turno actualizado correctamente', data: turnoActualizado });
});