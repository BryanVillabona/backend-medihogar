import Shift from './shift.model.js';
import User from '../users/user.model.js';
import Catalog from '../catalog/catalog.model.js';
import Client from '../clients/client.model.js';

export const createShift = async (req, res) => {
  try {
    const { 
      cliente_id, paciente_id, empleada_id, fecha_servicio, jornada, duracion_horas, 
      novedades, rol_ejercido, precio_cobrado_custom, costo_pagado_custom 
    } = req.body;

    const empleada = await User.findById(empleada_id);
    if (!empleada) {
      return res.status(404).json({ success: false, message: 'Empleada no encontrada' });
    }

    // 1. Buscar tarifa base en el Catálogo usando el rol_ejercido
    const tarifa = await Catalog.findOne({
      rol_requerido: rol_ejercido,
      duracion_horas: duracion_horas,
      estado: true
    });

    if (!tarifa && (!precio_cobrado_custom || !costo_pagado_custom)) {
      return res.status(400).json({ 
        success: false, 
        message: `No existe tarifa en catálogo para ${rol_ejercido} de ${duracion_horas}h. Debe enviar precios manuales.` 
      });
    }

    // 2. Lógica de Sobreescritura (Custom Pricing)
    const precioFinalCliente = precio_cobrado_custom || tarifa.precio_cobrado_cliente;
    const costoFinalEmpleada = costo_pagado_custom || tarifa.costo_pagado_empleada;

    // 3. Crear el turno (Estado por defecto: PROGRAMADO)
    const nuevoTurno = new Shift({
      cliente_id,
      paciente_id, // <-- AÑADIDO: Guardamos a cuál paciente va a visitar
      empleada_id,
      fecha_servicio,
      jornada,
      duracion_horas,
      rol_ejercido,
      precio_cobrado: precioFinalCliente,
      costo_pagado: costoFinalEmpleada,
      novedades
    });

    const turnoGuardado = await nuevoTurno.save();

    // 📢 --- NUEVO: AVISAR AL FRONTEND QUE HAY UN TURNO NUEVO ---
    const io = req.app.get('io');
    if (io) {
      io.to('room_admins').to(`room_empleada_${empleada_id}`).emit('refresh_shifts', { 
        mensaje: 'Nuevo turno programado' 
      });
    }
    // ------------------------------------------------------------

    res.status(201).json({
      success: true,
      message: 'Turno programado correctamente',
      data: turnoGuardado
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

export const completeShift = async (req, res) => {
  try {
    const { id } = req.params;
    // 👇 NUEVO: Recibimos si la señora mayor ya le pagó a la empleada
    const { pago_empleada_realizado } = req.body; 

    const shift = await Shift.findById(id);

    if (!shift) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
    if (shift.estado_turno === 'FINALIZADO') {
      return res.status(400).json({ success: false, message: 'El turno ya estaba finalizado' });
    }

    // 1. Cambiar estado y guardar si se le pagó a la empleada
    shift.estado_turno = 'FINALIZADO';
    shift.pago_empleada_realizado = pago_empleada_realizado || false;
    await shift.save();

    // 2. AHORA SÍ afectamos la cartera del cliente
    await Client.findByIdAndUpdate(shift.cliente_id, {
      $inc: { saldo_pendiente: shift.precio_cobrado }
    });

    // 📢 --- NUEVO: AVISAR SOLO A LOS ADMINS Y A LA EMPLEADA INVOLUCRADA ---
    const io = req.app.get('io');
    if (io) {
      io.to('room_admins').to(`room_empleada_${shift.empleada_id.toString()}`).emit('refresh_shifts', { 
        mensaje: 'Un turno ha sido finalizado' 
      });
    }
    // -------------------------------------------------------------

    res.status(200).json({
      success: true,
      message: 'Turno finalizado. Cartera del cliente actualizada.',
      data: shift
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al finalizar turno', error: error.message });
  }
};

// Obtener los turnos (Ahora con filtros de fecha para optimizar el frontend)
export const getShifts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 1. Filtro base de seguridad (Admin ve todo, empleada ve lo suyo)
    const filtro = req.user.rol === 'ADMIN' ? {} : { empleada_id: req.user._id || req.user.id };

    // 2. Si el frontend envía fechas, agregamos el filtro de rango de tiempo
    if (startDate && endDate) {
      filtro.fecha_servicio = {
        $gte: new Date(startDate), // Mayor o igual a la fecha de inicio
        $lte: new Date(endDate)    // Menor o igual a la fecha de fin
      };
    }

    // 3. Traemos los turnos ordenados por fecha
    const turnos = await Shift.find(filtro)
      // 👇 MODIFICADO: Traemos el arreglo de pacientes para buscar el específico
      .populate('cliente_id', 'nombre_responsable pacientes') 
      .populate('empleada_id', 'nombre_completo tipo_empleada')
      .sort({ fecha_servicio: 1 });
      
    // 4. MÁGIA DE TRANSFORMACIÓN: Buscamos el paciente correcto y lo exponemos como el frontend espera
    const turnosFormateados = turnos.map(turno => {
      const turnoObj = turno.toObject();

      if (turnoObj.cliente_id && turnoObj.cliente_id.pacientes) {
        // Buscamos cuál paciente coincide con el paciente_id del turno
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

        // Borramos el arreglo completo para no enviar datos innecesarios al frontend
        delete turnoObj.cliente_id.pacientes;
      }

      return turnoObj;
    });

    res.status(200).json({ success: true, data: turnosFormateados });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener turnos', error: error.message });
  }
};

export const cancelShift = async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Turno no encontrado' });
    }

    // Validaciones de negocio
    if (shift.estado_turno === 'CANCELADO') {
      return res.status(400).json({ success: false, message: 'El turno ya se encuentra cancelado' });
    }
    if (shift.estado_turno === 'FINALIZADO') {
      return res.status(400).json({ success: false, message: 'No se puede cancelar un turno que ya finalizó' });
    }

    // Cambiamos el estado
    shift.estado_turno = 'CANCELADO';
    await shift.save();

    // Reversamos el cobro al cliente
    await Client.findByIdAndUpdate(shift.cliente_id, {
      $inc: { saldo_pendiente: -shift.precio_cobrado }
    });

    // 📢 --- NUEVO: AVISAR AL FRONTEND QUE SE CANCELÓ UN TURNO ---
    const io = req.app.get('io');
    if (io) {
      io.to('room_admins').to(`room_empleada_${shift.empleada_id.toString()}`).emit('refresh_shifts', { 
        mensaje: 'Un turno ha sido cancelado' 
      });
    }
    // -------------------------------------------------------------

    res.status(200).json({
      success: true,
      message: 'Turno cancelado. El saldo del cliente ha sido ajustado.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cancelar el turno',
      error: error.message
    });
  }
};

export const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizaciones = req.body; 

    const turno = await Shift.findById(id);

    if (!turno) {
      return res.status(404).json({ success: false, message: 'Turno no encontrado' });
    }

    // REGLA DE NEGOCIO STRICTA: No se editan turnos ya cobrados o cancelados
    if (turno.estado_turno === 'FINALIZADO' || turno.estado_turno === 'CANCELADO') {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede editar un turno que ya fue finalizado o cancelado. Debe hacer un ajuste manual.' 
      });
    }

    // Actualizamos el documento con los nuevos datos
    const turnoActualizado = await Shift.findByIdAndUpdate(
      id,
      { $set: actualizaciones },
      { new: true, runValidators: true }
    );

    // 📢 --- NUEVO: AVISAR AL FRONTEND QUE SE ACTUALIZÓ UN TURNO ---
    const io = req.app.get('io');
    if (io) {
      io.to('room_admins').to(`room_empleada_${turnoActualizado.empleada_id.toString()}`).emit('refresh_shifts', { 
        mensaje: 'Un turno ha sido modificado' 
      });
    }
    // --------------------------------------------------------------

    res.status(200).json({
      success: true,
      message: 'Turno actualizado correctamente',
      data: turnoActualizado
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar el turno', error: error.message });
  }
};