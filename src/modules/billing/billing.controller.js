import Shift from '../shifts/shift.model.js';
import User from '../users/user.model.js';

// Liquidar la nómina de una empleada en un rango de fechas
export const calculateEmployeePayroll = async (req, res) => {
  try {
    // Recibimos los parámetros por la URL (Query Params)
    // Ejemplo: /api/billing/payroll/12345?startDate=2026-02-01&endDate=2026-02-28
    const { empleadaId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Debe proveer startDate y endDate' });
    }

    // 1. Verificamos que la empleada exista
    const empleada = await User.findById(empleadaId);
    if (!empleada) {
      return res.status(404).json({ success: false, message: 'Empleada no encontrada' });
    }

    // 2. Buscamos todos los turnos de esa empleada en ese rango de fechas
    // Usamos los operadores $gte (mayor o igual) y $lte (menor o igual) de MongoDB
    const turnos = await Shift.find({
      empleada_id: empleadaId,
      fecha_servicio: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    // 3. Calculamos el total a pagar sumando el 'costo_pagado' de cada turno
    // El método reduce() es perfecto para esto, igual que la función SUMA() de Excel
    const totalPagar = turnos.reduce((acumulador, turno) => acumulador + turno.costo_pagado, 0);

    // 4. Devolvemos el reporte financiero
    res.status(200).json({
      success: true,
      message: `Nómina calculada para ${empleada.nombre_completo}`,
      data: {
        empleada: empleada.nombre_completo,
        periodo: `${startDate} al ${endDate}`,
        cantidad_turnos: turnos.length,
        total_nomina: totalPagar,
        detalle_turnos: turnos // Opcional: enviamos los turnos por si el frontend quiere listarlos
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al calcular la nómina',
      error: error.message
    });
  }
};