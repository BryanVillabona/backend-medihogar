import Shift from './shift.model.js';
import User from '../users/user.model.js';
import Catalog from '../catalog/catalog.model.js';
import Client from '../clients/client.model.js';

export const createShift = async (req, res) => {
  try {
    const { 
      cliente_id, empleada_id, fecha_servicio, jornada, duracion_horas, 
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
    if (io) io.emit('refresh_shifts', { mensaje: 'Nuevo turno programado' });
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
    const shift = await Shift.findById(id);

    if (!shift) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
    if (shift.estado_turno === 'FINALIZADO') {
      return res.status(400).json({ success: false, message: 'El turno ya estaba finalizado' });
    }

    // 1. Cambiar estado
    shift.estado_turno = 'FINALIZADO';
    await shift.save();

    // 2. AHORA SÍ afectamos la cartera del cliente
    await Client.findByIdAndUpdate(shift.cliente_id, {
      $inc: { saldo_pendiente: shift.precio_cobrado }
    });

    // 📢 --- NUEVO: AVISAR AL FRONTEND QUE UN TURNO SE FINALIZÓ ---
    const io = req.app.get('io');
    if (io) io.emit('refresh_shifts', { mensaje: 'Un turno ha sido finalizado' });
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

// Obtener los turnos (Podemos filtrarlos luego, por ahora traemos todos)
export const getShifts = async (req, res) => {
  try {
    const filtro = req.user.rol === 'ADMIN' ? {} : { empleada_id: req.user._id || req.user.id };

    const turnos = await Shift.find(filtro)
      .populate('cliente_id', 'nombre_paciente nombre_responsable')
      .populate('empleada_id', 'nombre_completo tipo_empleada');
      
    res.status(200).json({ success: true, data: turnos });
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
    if (io) io.emit('refresh_shifts', { mensaje: 'Un turno ha sido cancelado' });
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
    if (io) io.emit('refresh_shifts', { mensaje: 'Un turno ha sido modificado' });
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