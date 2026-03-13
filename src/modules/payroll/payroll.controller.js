import Shift from '../shifts/shift.model.js';
import PayrollAdjustment from './payrollAdjustment.model.js';
import User from '../users/user.model.js';

export const registerPayrollAdjustment = async (req, res) => {
  try {
    const { empleada_id, tipo_movimiento, concepto, monto, fecha_aplicacion } = req.body;

    // Validación básica
    if (!['INGRESO', 'EGRESO'].includes(tipo_movimiento)) {
      return res.status(400).json({ success: false, message: 'El tipo debe ser INGRESO (Bono) o EGRESO (Préstamo)' });
    }

    const nuevaNovedad = new PayrollAdjustment({
      empleada_id,
      tipo_movimiento,
      concepto,
      monto,
      fecha_aplicacion
    });

    const novedadGuardada = await nuevaNovedad.save();

    res.status(201).json({
      success: true,
      message: `${tipo_movimiento === 'INGRESO' ? 'Bono' : 'Préstamo/Deducción'} registrado correctamente`,
      data: novedadGuardada
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al registrar la novedad', error: error.message });
  }
};

export const generateMonthlyPayroll = async (req, res) => {
  try {
    const { mes, anio, empleada_id } = req.query;
    
    // 1. Calcular el rango de fechas para la búsqueda
    // Parseamos los años y meses (que vienen como strings en req.query) a enteros
    const yearNum = parseInt(anio, 10);
    const monthNum = parseInt(mes, 10);
    
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // 2. Filtro base para los turnos
    const shiftMatch = {
      fecha_servicio: { $gte: startDate, $lte: endDate },
      estado_turno: 'FINALIZADO'
    };
    
    // Si queremos la nómina de una sola empleada, lo agregamos al filtro
    if (empleada_id) shiftMatch.empleada_id = empleada_id;

    // 3. Pipeline de Agregación para sumar los Turnos (MIGRADO A ESTADO DE PAGO)
    const turnosConsolidados = await Shift.aggregate([
      { $match: shiftMatch },
      {
        $group: {
          _id: '$empleada_id',
          total_turnos: { $sum: 1 }, 
          total_ganado_turnos: { $sum: '$costo_pagado' }, 
          // 👇 ACTUALIZADO: Compara contra el nuevo campo estado_pago_empleada
          dinero_turnos_pagados: { 
            $sum: { $cond: [{ $eq: ['$estado_pago_empleada', 'PAGADO'] }, '$costo_pagado', 0] }
          },
          // 👇 ACTUALIZADO: Compara contra el nuevo campo estado_pago_empleada
          dinero_turnos_pendientes: { 
            $sum: { $cond: [{ $eq: ['$estado_pago_empleada', 'PENDIENTE'] }, '$costo_pagado', 0] }
          }
        }
      }
    ]);

    // 4. Filtro base para las novedades (Bonos/Préstamos)
    const adjMatch = {
      fecha_aplicacion: { $gte: startDate, $lte: endDate },
      estado: 'PENDIENTE'
    };
    if (empleada_id) adjMatch.empleada_id = empleada_id;

    // 5. Consultar Novedades
    const novedades = await PayrollAdjustment.aggregate([
      { $match: adjMatch },
      {
        $group: {
          _id: '$empleada_id',
          total_ingresos_extra: {
            $sum: { $cond: [{ $eq: ['$tipo_movimiento', 'INGRESO'] }, '$monto', 0] }
          },
          total_deducciones: {
            $sum: { $cond: [{ $eq: ['$tipo_movimiento', 'EGRESO'] }, '$monto', 0] }
          }
        }
      }
    ]);

    // 6. Unificar los datos (Merge)
    const nominaFinal = [];
    const empleadasIds = turnosConsolidados.map(t => t._id);
    
    // Obtener los datos reales de las empleadas para el reporte
    const empleadasData = await User.find({ _id: { $in: empleadasIds } }).select('nombre_completo cedula tipo_empleada');

    for (const emp of empleadasData) {
      const turnos = turnosConsolidados.find(t => t._id.toString() === emp._id.toString()) || { total_turnos: 0, total_ganado_turnos: 0, dinero_turnos_pagados: 0, dinero_turnos_pendientes: 0 };
      const nov = novedades.find(n => n._id.toString() === emp._id.toString()) || { total_ingresos_extra: 0, total_deducciones: 0 };

      // El cálculo del neto a pagar ahora usa solo los turnos PENDIENTES
      const neto_a_pagar = (turnos.dinero_turnos_pendientes + nov.total_ingresos_extra) - nov.total_deducciones;

      nominaFinal.push({
        empleada: {
          id: emp._id,
          nombre: emp.nombre_completo,
          cedula: emp.cedula,
          perfil: emp.tipo_empleada
        },
        resumen: {
          cantidad_turnos: turnos.total_turnos,
          ganancia_por_turnos: turnos.total_ganado_turnos, 
          turnos_pagados_anticipado: turnos.dinero_turnos_pagados, 
          turnos_por_pagar: turnos.dinero_turnos_pendientes, 
          bonos_extras: nov.total_ingresos_extra,
          descuentos_prestamos: nov.total_deducciones,
          neto_a_pagar: neto_a_pagar // El cheque final que se le debe HOY
        }
      });
    }

    res.status(200).json({
      success: true,
      periodo: `${mes}-${anio}`,
      data: nominaFinal
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar nómina', error: error.message });
  }
};