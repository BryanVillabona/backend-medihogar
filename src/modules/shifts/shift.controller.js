import Shift from './shift.model.js';
import User from '../users/user.model.js';
import Catalog from '../catalog/catalog.model.js';
import Client from '../clients/client.model.js';

export const createShift = async (req, res) => {
  try {
    const { cliente_id, empleada_id, fecha_servicio, jornada, duracion_horas, novedades } = req.body;

    // 1. Validar que la empleada exista para saber su rol
    const empleada = await User.findById(empleada_id);
    if (!empleada) {
      return res.status(404).json({ success: false, message: 'Empleada no encontrada' });
    }

    // 2. Mapear el tipo de empleada con el rol del catálogo
    // En el modelo User tenemos 'AUXILIAR_FIJA', 'CUIDADORA_FIJA', etc.
    // En el Catálogo tenemos 'AUXILIAR', 'CUIDADORA'.
    let rolParaCatalogo = 'CUIDADORA'; // Por defecto
    if (empleada.tipo_empleada === 'AUXILIAR_FIJA') {
      rolParaCatalogo = 'AUXILIAR';
    } else if (empleada.tipo_empleada === 'CUIDADORA_FIJA' || empleada.tipo_empleada === 'TURNADORA') {
      rolParaCatalogo = 'CUIDADORA';
    }

    // 3. Buscar la tarifa en el Catálogo Maestro
    const tarifa = await Catalog.findOne({
      rol_requerido: rolParaCatalogo,
      duracion_horas: duracion_horas,
      estado: true
    });

    if (!tarifa) {
      return res.status(400).json({ 
        success: false, 
        message: `No existe una tarifa configurada para ${rolParaCatalogo} de ${duracion_horas} horas.` 
      });
    }

    // 4. Crear el turno CONGELANDO los precios
    const nuevoTurno = new Shift({
      cliente_id,
      empleada_id,
      fecha_servicio,
      jornada, // 'DIA' o 'NOCHE'
      duracion_horas,
      precio_cobrado: tarifa.precio_cobrado_cliente,
      costo_pagado: tarifa.costo_pagado_empleada,
      novedades
    });

    const turnoGuardado = await nuevoTurno.save();

    // 5. Actualizar la Cartera del Cliente (Le sumamos la deuda)
    // Usamos $inc de MongoDB que es atómico y ultra rápido para sumar valores
    await Client.findByIdAndUpdate(cliente_id, {
      $inc: { saldo_pendiente: tarifa.precio_cobrado_cliente }
    });

    // 6. Responder al frontend
    res.status(201).json({
      success: true,
      message: 'Turno asignado y cartera del cliente actualizada',
      data: turnoGuardado
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno al procesar el turno',
      error: error.message
    });
  }
};

// Obtener los turnos (Podemos filtrarlos luego, por ahora traemos todos)
export const getShifts = async (req, res) => {
  try {
    // Usamos .populate() para que MongoDB nos traiga los datos del cliente y la empleada, no solo el ID
    const turnos = await Shift.find()
      .populate('cliente_id', 'nombre_paciente nombre_responsable')
      .populate('empleada_id', 'nombre_completo tipo_empleada');
      
    res.status(200).json({ success: true, data: turnos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener turnos', error: error.message });
  }
};