import Shift from '../shifts/shift.model.js';
import User from '../users/user.model.js';
import Client from '../clients/client.model.js'; 
import Payment from './payment.model.js'; 
import PayrollAdjustment from '../payroll/payrollAdjustment.model.js'; 

// =========================================================================
// 1. NÓMINA: Liquidar a una empleada
// =========================================================================
export const calculateEmployeePayroll = async (req, res) => {
  try {
    const { empleadaId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Debe proveer startDate y endDate' });
    }

    // 🛡️ BLINDAJE ZONA HORARIA COLOMBIA (UTC-5) 🛡️
    const start = new Date(`${startDate}T00:00:00.000-05:00`);
    const end = new Date(`${endDate}T23:59:59.999-05:00`);

    const empleada = await User.findById(empleadaId);
    if (!empleada) {
      return res.status(404).json({ success: false, message: 'Empleada no encontrada' });
    }

    const turnos = await Shift.find({
      empleada_id: empleadaId,
      estado_turno: 'FINALIZADO',
      fecha_servicio: {
        $gte: start,
        $lte: end
      }
    })
    // 👇 CORRECCIÓN: Traemos pacientes para buscar el nombre real
    .populate('cliente_id', 'nombre_responsable pacientes')
    .sort('fecha_servicio');

    // 👇 MAGIA: Formatear los turnos para que el PDF lea bien el nombre
    const turnosFormateados = turnos.map(turno => {
      const tObj = turno.toObject();
      if (tObj.cliente_id && tObj.cliente_id.pacientes) {
        const pacienteEspecifico = tObj.cliente_id.pacientes.find(
          p => p._id.toString() === tObj.paciente_id?.toString()
        );
        tObj.cliente_id.nombre_paciente = pacienteEspecifico ? pacienteEspecifico.nombre_paciente : 'Paciente Inactivo/Eliminado';
        delete tObj.cliente_id.pacientes;
      }
      return tObj;
    });

    const novedades = await PayrollAdjustment.find({
      empleada_id: empleadaId,
      estado: 'PENDIENTE',
      fecha_aplicacion: {
        $gte: start,
        $lte: end
      }
    }).sort('fecha_aplicacion');

    const totalGanadoTurnos = turnosFormateados.reduce((acumulador, turno) => acumulador + turno.costo_pagado, 0);
    
    let totalBonos = 0;
    let totalDeducciones = 0;

    novedades.forEach(novedad => {
      if (novedad.tipo_movimiento === 'INGRESO') totalBonos += novedad.monto;
      if (novedad.tipo_movimiento === 'EGRESO') totalDeducciones += novedad.monto;
    });

    const netoPagar = (totalGanadoTurnos + totalBonos) - totalDeducciones;

    res.status(200).json({
      success: true,
      message: `Nómina calculada para ${empleada.nombre_completo}`,
      data: {
        empleada: empleada.nombre_completo,
        cedula: empleada.cedula,
        periodo: `${startDate} al ${endDate}`,
        resumen: {
          cantidad_turnos: turnosFormateados.length,
          subtotal_turnos: totalGanadoTurnos,
          total_bonos_extra: totalBonos,
          total_descuentos_prestamos: totalDeducciones,
          neto_a_pagar: netoPagar
        },
        detalle_turnos: turnosFormateados,
        novedades: novedades
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
    const { clienteId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Debe proveer startDate y endDate' });
    }

    // 🛡️ BLINDAJE ZONA HORARIA COLOMBIA (UTC-5) 🛡️
    const start = new Date(`${startDate}T00:00:00.000-05:00`);
    const end = new Date(`${endDate}T23:59:59.999-05:00`);

    // 👇 CORRECCIÓN: Traemos los pacientes en lugar de un solo nombre_paciente
    const cliente = await Client.findById(clienteId).select('nombre_responsable pacientes saldo_pendiente documento_responsable telefono_contacto direccion_servicio');
    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    const turnosDelMes = await Shift.find({
      cliente_id: clienteId,
      estado_turno: 'FINALIZADO',
      fecha_servicio: { 
        $gte: start, 
        $lte: end 
      }
    })
    .populate('empleada_id', 'nombre_completo')
    .select('fecha_servicio jornada duracion_horas precio_cobrado rol_ejercido empleada_id paciente_id cliente_id').sort('fecha_servicio');

    // 👇 MAGIA: Anidamos el nombre del paciente dentro de cliente_id para que el agrupador del PDF funcione
    const turnosFormateados = turnosDelMes.map(turno => {
      const tObj = turno.toObject();
      const pacienteEspecifico = cliente.pacientes.find(p => p._id.toString() === tObj.paciente_id?.toString());
      
      tObj.cliente_id = {
        nombre_paciente: pacienteEspecifico ? pacienteEspecifico.nombre_paciente : 'Paciente Inactivo/Eliminado',
      };
      return tObj;
    });

    const totalFacturadoMes = turnosFormateados.reduce((sum, t) => sum + t.precio_cobrado, 0);

    const pagosDelMes = await Payment.find({
      cliente_id: clienteId,
      fecha_pago: { 
        $gte: start, 
        $lte: end 
      }
    }).select('monto_pagado fecha_pago metodo_pago referencia');

    const totalPagadoMes = pagosDelMes.reduce((sum, p) => sum + p.monto_pagado, 0);

    // Resumen de todos los pacientes para el encabezado del PDF
    const nombresTodosPacientes = cliente.pacientes.length > 0 
      ? cliente.pacientes.map(p => p.nombre_paciente).join(', ') 
      : 'Sin pacientes registrados';

    res.status(200).json({
      success: true,
      data: {
        cliente: {
          nombre: cliente.nombre_responsable,
          paciente: nombresTodosPacientes, // <-- Mostrará algo como: "Don Pedro, Doña Rosa"
          documento: cliente.documento_responsable,
          telefono: cliente.telefono_contacto,
          direccion: cliente.direccion_servicio,
          saldo_historico_pendiente_total: cliente.saldo_pendiente
        },
        periodo_consultado: `${startDate} al ${endDate}`,
        resumen_periodo: {
          total_turnos_realizados: turnosFormateados.length,
          subtotal_facturado_rango: totalFacturadoMes,
          total_abonos_recibidos: totalPagadoMes,
          balance_del_rango: totalFacturadoMes - totalPagadoMes
        },
        detalle_turnos: turnosFormateados,
        detalle_pagos: pagosDelMes
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar estado de cuenta', error: error.message });
  }
};

// =========================================================================
// 3. REPORTE GERENCIAL GLOBAL MEJORADO (Con Desglose para Excel)
// =========================================================================
export const getGlobalReport = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    
    if (!mes || !anio) {
      return res.status(400).json({ success: false, message: 'Debe proveer mes y año' });
    }

    // 🛡️ BLINDAJE ZONA HORARIA COLOMBIA (UTC-5) PARA MES EXACTO 🛡️
    const mesStr = String(mes).padStart(2, '0');
    const startOfMonth = new Date(`${anio}-${mesStr}-01T00:00:00.000-05:00`);
    const lastDay = new Date(anio, mes, 0).getDate();
    const endOfMonth = new Date(`${anio}-${mesStr}-${lastDay}T23:59:59.999-05:00`);

    const turnos = await Shift.find({
      fecha_servicio: { $gte: startOfMonth, $lte: endOfMonth },
      estado_turno: 'FINALIZADO'
    })
    .populate('empleada_id', 'nombre_completo cedula tipo_empleada')
    // 👇 CORRECCIÓN: Traemos los pacientes para el Excel Global 👇
    .populate('cliente_id', 'nombre_responsable pacientes saldo_pendiente'); 

    const novedades = await PayrollAdjustment.find({
      fecha_aplicacion: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate('empleada_id', 'nombre_completo cedula tipo_empleada');

    const pagos = await Payment.find({
      fecha_pago: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate('cliente_id', 'nombre_responsable pacientes saldo_pendiente');

    const ingresosBrutos = turnos.reduce((sum, t) => sum + t.precio_cobrado, 0);
    const nominaBase = turnos.reduce((sum, t) => sum + t.costo_pagado, 0);

    let totalBonosPagados = 0;
    let totalPrestamosDescontados = 0;
    novedades.forEach(nov => {
      if (nov.tipo_movimiento === 'INGRESO') totalBonosPagados += nov.monto;
      if (nov.tipo_movimiento === 'EGRESO') totalPrestamosDescontados += nov.monto;
    });

    const egresosNetos = (nominaBase + totalBonosPagados) - totalPrestamosDescontados;
    const utilidadBruta = ingresosBrutos - egresosNetos;

    const nominaMap = {};
    turnos.forEach(t => {
      if (!t.empleada_id) return;
      const empId = t.empleada_id._id.toString();
      if (!nominaMap[empId]) {
        nominaMap[empId] = { nombre: t.empleada_id.nombre_completo, cedula: t.empleada_id.cedula || 'N/A', rol_fijo: t.empleada_id.tipo_empleada, cantidad_turnos: 0, sueldo_base: 0, bonificaciones: 0, prestamos: 0, total_a_pagar: 0 };
      }
      nominaMap[empId].cantidad_turnos += 1;
      nominaMap[empId].sueldo_base += t.costo_pagado;
    });

    novedades.forEach(nov => {
      if (!nov.empleada_id) return;
      const empId = nov.empleada_id._id.toString();
      if (!nominaMap[empId]) {
        nominaMap[empId] = { nombre: nov.empleada_id.nombre_completo, cedula: nov.empleada_id.cedula || 'N/A', rol_fijo: nov.empleada_id.tipo_empleada, cantidad_turnos: 0, sueldo_base: 0, bonificaciones: 0, prestamos: 0, total_a_pagar: 0 };
      }
      if (nov.tipo_movimiento === 'INGRESO') nominaMap[empId].bonificaciones += nov.monto;
      if (nov.tipo_movimiento === 'EGRESO') nominaMap[empId].prestamos += nov.monto;
    });

    const detalleNomina = Object.values(nominaMap).map(emp => {
      emp.total_a_pagar = (emp.sueldo_base + emp.bonificaciones) - emp.prestamos;
      return emp;
    });

    const clientesMap = {};
    turnos.forEach(t => {
      if (!t.cliente_id) return;
      const cliId = t.cliente_id._id.toString();
      
      if (!clientesMap[cliId]) {
        // Unimos los nombres de los pacientes para la columna de Excel
        const listaPacientes = t.cliente_id.pacientes && t.cliente_id.pacientes.length > 0 
          ? t.cliente_id.pacientes.map(p => p.nombre_paciente).join(', ') 
          : 'Sin pacientes';

        clientesMap[cliId] = {
          responsable: t.cliente_id.nombre_responsable,
          paciente: listaPacientes,
          saldo_actual: t.cliente_id.saldo_pendiente, 
          cantidad_turnos: 0,
          total_facturado_mes: 0,
          abonos_mes: 0
        };
      }
      clientesMap[cliId].cantidad_turnos += 1;
      clientesMap[cliId].total_facturado_mes += t.precio_cobrado;
    });

    pagos.forEach(p => {
      if (!p.cliente_id) return;
      const cliId = p.cliente_id._id.toString();

      if (!clientesMap[cliId]) {
        const listaPacientes = p.cliente_id.pacientes && p.cliente_id.pacientes.length > 0 
          ? p.cliente_id.pacientes.map(pac => pac.nombre_paciente).join(', ') 
          : 'Sin pacientes';

        clientesMap[cliId] = {
          responsable: p.cliente_id.nombre_responsable,
          paciente: listaPacientes,
          saldo_actual: p.cliente_id.saldo_pendiente,
          cantidad_turnos: 0,
          total_facturado_mes: 0,
          abonos_mes: 0
        };
      }
      clientesMap[cliId].abonos_mes += p.monto_pagado;
    });

    const detalleClientes = Object.values(clientesMap);

    res.status(200).json({
      success: true,
      data: {
        periodo: `${mesStr}-${anio}`,
        total_turnos_operados: turnos.length,
        total_facturado_clientes: ingresosBrutos,
        total_costo_empleadas: egresosNetos,
        utilidad_bruta: utilidadBruta,
        detalle_nomina: detalleNomina,
        detalle_clientes: detalleClientes
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar reporte global', error: error.message });
  }
};