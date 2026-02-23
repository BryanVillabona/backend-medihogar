import Shift from '../shifts/shift.model.js';
import User from '../users/user.model.js';
import Client from '../clients/client.model.js'; 
import Payment from './payment.model.js'; 
// Importamos el nuevo modelo de novedades que creamos antes
import PayrollAdjustment from '../payroll/payrollAdjustment.model.js'; 

// =========================================================================
// 1. NÓMINA: Liquidar a una empleada (Tu función mejorada con las reglas)
// =========================================================================
export const calculateEmployeePayroll = async (req, res) => {
  try {
    const { empleadaId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Debe proveer startDate y endDate' });
    }

    const empleada = await User.findById(empleadaId);
    if (!empleada) {
      return res.status(404).json({ success: false, message: 'Empleada no encontrada' });
    }

    // A. Buscar turnos (Regla de oro: SOLO LOS FINALIZADOS)
    const turnos = await Shift.find({
      empleada_id: empleadaId,
      estado_turno: 'FINALIZADO', // Si no está finalizado, no se paga
      fecha_servicio: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    // B. Buscar novedades (Préstamos y Bonificaciones en ese rango de fechas)
    const novedades = await PayrollAdjustment.find({
      empleada_id: empleadaId,
      estado: 'PENDIENTE', // Solo cobramos/pagamos lo que no se haya aplicado antes
      fecha_aplicacion: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    // C. Cálculos matemáticos
    const totalGanadoTurnos = turnos.reduce((acumulador, turno) => acumulador + turno.costo_pagado, 0);
    
    let totalBonos = 0;
    let totalDeducciones = 0;

    novedades.forEach(novedad => {
      if (novedad.tipo_movimiento === 'INGRESO') totalBonos += novedad.monto;
      if (novedad.tipo_movimiento === 'EGRESO') totalDeducciones += novedad.monto;
    });

    const netoPagar = (totalGanadoTurnos + totalBonos) - totalDeducciones;

    // D. Devolver el reporte tipo "Desprendible de pago"
    res.status(200).json({
      success: true,
      message: `Nómina calculada para ${empleada.nombre_completo}`,
      data: {
        empleada: empleada.nombre_completo,
        periodo: `${startDate} al ${endDate}`,
        resumen: {
          cantidad_turnos: turnos.length,
          subtotal_turnos: totalGanadoTurnos,
          total_bonos_extra: totalBonos,
          total_descuentos_prestamos: totalDeducciones,
          neto_a_pagar: netoPagar
        },
        detalle_turnos: turnos,
        detalle_novedades: novedades
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al calcular la nómina', error: error.message });
  }
};

// =========================================================================
// 2. FACTURACIÓN: Generar el estado de cuenta para cobrarle al Cliente
// =========================================================================
export const generateClientStatement = async (req, res) => {
  try {
    const { clienteId } = req.params; // Ej: /api/billing/statement/12345?startDate=...
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Debe proveer startDate y endDate' });
    }

    const cliente = await Client.findById(clienteId).select('nombre_responsable nombre_paciente saldo_pendiente');
    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    // A. Obtener el detalle de los turnos que se le prestaron en esa fecha
    const turnosDelMes = await Shift.find({
      cliente_id: clienteId,
      estado_turno: 'FINALIZADO', // Solo se cobran los ejecutados
      fecha_servicio: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    }).select('fecha_servicio jornada duracion_horas precio_cobrado rol_ejercido').sort('fecha_servicio');

    const totalFacturadoMes = turnosDelMes.reduce((sum, t) => sum + t.precio_cobrado, 0);

    // B. Obtener los pagos/abonos que hizo el cliente en esa fecha
    const pagosDelMes = await Payment.find({
      cliente_id: clienteId,
      fecha_pago: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    }).select('monto_pagado fecha_pago metodo_pago referencia');

    const totalPagadoMes = pagosDelMes.reduce((sum, p) => sum + p.monto_pagado, 0);

    // C. Generar el documento final (Reemplazo de la hoja de Excel del cliente)
    res.status(200).json({
      success: true,
      data: {
        cliente: {
          nombre: cliente.nombre_responsable,
          paciente: cliente.nombre_paciente,
          saldo_historico_pendiente_total: cliente.saldo_pendiente // La deuda global en la BD
        },
        periodo_consultado: `${startDate} al ${endDate}`,
        resumen_periodo: {
          total_turnos_realizados: turnosDelMes.length,
          subtotal_facturado_rango: totalFacturadoMes,
          total_abonos_recibidos: totalPagadoMes,
          balance_del_rango: totalFacturadoMes - totalPagadoMes // Lo que se generó de deuda nueva vs lo pagado en este mes
        },
        detalle_turnos: turnosDelMes,
        detalle_pagos: pagosDelMes
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar estado de cuenta', error: error.message });
  }
};