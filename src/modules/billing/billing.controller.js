import Shift from '../shifts/shift.model.js';
import User from '../users/user.model.js';
import Client from '../clients/client.model.js'; 
import Payment from './payment.model.js'; 
import PayrollAdjustment from '../payroll/payrollAdjustment.model.js'; 

// =========================================================================
// 1. NÓMINA: Liquidar a una empleada (MATEMÁTICA DE CAJAS SEPARADAS)
// =========================================================================
export const calculateEmployeePayroll = async (req, res) => {
  try {
    const { empleadaId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Faltan fechas' });

    const start = new Date(`${startDate}T00:00:00.000-05:00`);
    const end = new Date(`${endDate}T23:59:59.999-05:00`);

    const empleada = await User.findById(empleadaId);
    if (!empleada) return res.status(404).json({ success: false, message: 'Empleada no encontrada' });

    const turnos = await Shift.find({
      empleada_id: empleadaId,
      estado_turno: 'FINALIZADO',
      fecha_servicio: { $gte: start, $lte: end }
    }).populate('cliente_id', 'nombre_responsable pacientes').sort('fecha_servicio');

    let sueldo_turnos = 0;
    let turnos_pagados = 0;

    const turnosFormateados = turnos.map(turno => {
      const tObj = turno.toObject();
      if (tObj.cliente_id && tObj.cliente_id.pacientes) {
        const p = tObj.cliente_id.pacientes.find(p => p._id.toString() === tObj.paciente_id?.toString());
        tObj.cliente_id.nombre_paciente = p ? p.nombre_paciente : 'Paciente Inactivo';
        delete tObj.cliente_id.pacientes;
      }
      
      sueldo_turnos += tObj.costo_pagado;
      if (tObj.estado_pago_empleada === 'PAGADO') turnos_pagados += tObj.costo_pagado;

      return tObj;
    });

    const novedades = await PayrollAdjustment.find({
      empleada_id: empleadaId,
      fecha_aplicacion: { $gte: start, $lte: end }
    }).sort('fecha_aplicacion');

    let bonos_totales = 0;
    let bonos_pagados = 0;
    let prestamos_totales = 0;
    let prestamos_aplicados = 0; 

    novedades.forEach(n => {
      if (n.estado !== 'ANULADO') {
        if (n.tipo_movimiento === 'INGRESO') {
          bonos_totales += n.monto;
          if (n.estado === 'APLICADO') bonos_pagados += n.monto; 
        }
        if (n.tipo_movimiento === 'EGRESO') {
          prestamos_totales += n.monto;
          if (n.estado === 'APLICADO') prestamos_aplicados += n.monto; 
        }
      }
    });

    // 🌟 MATEMÁTICA DEFINITIVA DE CAJAS INDEPENDIENTES 🌟
    
    // 1. Lo que produjo en total
    const total_devengado = sueldo_turnos + bonos_totales;
    
    // 2. El dinero en efectivo real que ya le hemos dado en la mano
    const pagos_ya_realizados = turnos_pagados + bonos_pagados;
    
    // 3. Su "Bolsillo": Lo que produjo menos el efectivo que ya le dimos
    const saldo_disponible_empleada = total_devengado - pagos_ya_realizados;
    
    // 4. Su "Deuda": Préstamos totales menos los que ya pagó (aplicados)
    const deuda_activa_empleada = prestamos_totales - prestamos_aplicados;

    // 5. El Neto: Lo que tiene en el bolsillo menos lo que nos debe
    let neto_a_pagar = saldo_disponible_empleada - deuda_activa_empleada;
    
    // 6. Para las visuales (Lo que se dedujo del total devengado)
    const total_deducido = pagos_ya_realizados + deuda_activa_empleada;

    res.status(200).json({
      success: true,
      data: {
        empleada: empleada.nombre_completo,
        cedula: empleada.cedula,
        periodo: `${startDate} al ${endDate}`,
        resumen: {
          cantidad_turnos: turnosFormateados.length,
          sueldo_turnos,
          bonos_totales,
          prestamos_totales,
          pagos_ya_realizados, 
          total_devengado,
          total_deducido,
          neto_a_pagar 
        },
        detalle_turnos: turnosFormateados,
        novedades: novedades
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// =========================================================================
// 2. FACTURACIÓN: Generar estado de cuenta (CLIENTES - Sin cambios)
// =========================================================================
export const generateClientStatement = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Faltan fechas' });

    const start = new Date(`${startDate}T00:00:00.000-05:00`);
    const end = new Date(`${endDate}T23:59:59.999-05:00`);

    const cliente = await Client.findById(clienteId).select('nombre_responsable pacientes saldo_pendiente documento_responsable telefono_contacto direccion_servicio');
    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    const turnosDelMes = await Shift.find({
      cliente_id: clienteId,
      estado_turno: 'FINALIZADO',
      fecha_servicio: { $gte: start, $lte: end }
    }).populate('empleada_id', 'nombre_completo').select('fecha_servicio jornada duracion_horas precio_cobrado rol_ejercido empleada_id paciente_id cliente_id').sort('fecha_servicio');

    const turnosFormateados = turnosDelMes.map(turno => {
      const tObj = turno.toObject();
      const pacienteEspecifico = cliente.pacientes.find(p => p._id.toString() === tObj.paciente_id?.toString());
      tObj.cliente_id = { nombre_paciente: pacienteEspecifico ? pacienteEspecifico.nombre_paciente : 'Inactivo' };
      return tObj;
    });

    const totalFacturadoMes = turnosFormateados.reduce((sum, t) => sum + t.precio_cobrado, 0);

    const pagosDelMes = await Payment.find({
      cliente_id: clienteId,
      fecha_pago: { $gte: start, $lte: end }
    }).select('monto_pagado fecha_pago metodo_pago referencia');

    const totalPagadoMes = pagosDelMes.reduce((sum, p) => sum + p.monto_pagado, 0);
    const nombresTodosPacientes = cliente.pacientes.length > 0 ? cliente.pacientes.map(p => p.nombre_paciente).join(', ') : 'Sin pacientes';

    res.status(200).json({
      success: true,
      data: {
        cliente: {
          nombre: cliente.nombre_responsable,
          paciente: nombresTodosPacientes,
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
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// =========================================================================
// 3. REPORTE GERENCIAL (EXCEL)
// =========================================================================
export const getGlobalReport = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ success: false, message: 'Debe proveer mes y año' });

    const mesStr = String(mes).padStart(2, '0');
    const startOfMonth = new Date(`${anio}-${mesStr}-01T00:00:00.000-05:00`);
    const lastDay = new Date(anio, mes, 0).getDate();
    const endOfMonth = new Date(`${anio}-${mesStr}-${lastDay}T23:59:59.999-05:00`);

    const turnos = await Shift.find({
      fecha_servicio: { $gte: startOfMonth, $lte: endOfMonth },
      estado_turno: 'FINALIZADO'
    }).populate('empleada_id', 'nombre_completo cedula tipo_empleada').populate('cliente_id', 'nombre_responsable pacientes saldo_pendiente'); 

    const novedades = await PayrollAdjustment.find({
      fecha_aplicacion: { $gte: startOfMonth, $lte: endOfMonth },
      estado: { $ne: 'ANULADO' }
    }).populate('empleada_id', 'nombre_completo cedula tipo_empleada');

    const pagos = await Payment.find({
      fecha_pago: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate('cliente_id', 'nombre_responsable pacientes saldo_pendiente');

    const ingresosBrutos = turnos.reduce((sum, t) => sum + t.precio_cobrado, 0);
    const costoBaseTurnos = turnos.reduce((sum, t) => sum + t.costo_pagado, 0);
    const costoBonos = novedades.filter(n => n.tipo_movimiento === 'INGRESO').reduce((sum, n) => sum + n.monto, 0);
    
    const costoTotalEmpleadas = costoBaseTurnos + costoBonos;
    const utilidadBruta = ingresosBrutos - costoTotalEmpleadas;

    const nominaMap = {};

    const initializeEmp = (emp) => {
      const id = emp._id.toString();
      if (!nominaMap[id]) {
        nominaMap[id] = { 
          nombre: emp.nombre_completo, cedula: emp.cedula || 'N/A', rol: emp.tipo_empleada, 
          cantidad_turnos: 0, sueldo_turnos: 0, bonos: 0, total_costo_empresa: 0, 
          turnos_pagados: 0, bonos_pagados: 0, prestamos: 0, prestamos_aplicados: 0, 
          pagos_ya_realizados: 0, neto_a_pagar: 0 
        };
      }
      return id;
    };

    turnos.forEach(t => {
      if (!t.empleada_id) return;
      const empId = initializeEmp(t.empleada_id);
      nominaMap[empId].cantidad_turnos += 1;
      nominaMap[empId].sueldo_turnos += t.costo_pagado;
      if (t.estado_pago_empleada === 'PAGADO') nominaMap[empId].turnos_pagados += t.costo_pagado;
    });

    novedades.forEach(n => {
      if (!n.empleada_id) return;
      const empId = initializeEmp(n.empleada_id);
      if (n.tipo_movimiento === 'INGRESO') {
        nominaMap[empId].bonos += n.monto;
        if (n.estado === 'APLICADO') nominaMap[empId].bonos_pagados += n.monto; 
      }
      if (n.tipo_movimiento === 'EGRESO') {
        nominaMap[empId].prestamos += n.monto;
        if (n.estado === 'APLICADO') nominaMap[empId].prestamos_aplicados += n.monto; 
      }
    });

    const detalleNomina = Object.values(nominaMap).map(emp => {
      emp.total_costo_empresa = emp.sueldo_turnos + emp.bonos;
      
      const saldo_disponible = emp.total_costo_empresa - (emp.turnos_pagados + emp.bonos_pagados);
      const deuda_activa = emp.prestamos - emp.prestamos_aplicados;
      
      emp.pagos_ya_realizados = emp.turnos_pagados + emp.bonos_pagados;
      emp.neto_a_pagar = saldo_disponible - deuda_activa;

      return emp;
    });

    const clientesMap = {};
    turnos.forEach(t => {
      if (!t.cliente_id) return;
      const cliId = t.cliente_id._id.toString();
      if (!clientesMap[cliId]) {
        const listaPacientes = t.cliente_id.pacientes && t.cliente_id.pacientes.length > 0 ? t.cliente_id.pacientes.map(p => p.nombre_paciente).join(', ') : 'Sin pacientes';
        clientesMap[cliId] = { responsable: t.cliente_id.nombre_responsable, paciente: listaPacientes, saldo_actual: t.cliente_id.saldo_pendiente, cantidad_turnos: 0, total_facturado_mes: 0, abonos_mes: 0 };
      }
      clientesMap[cliId].cantidad_turnos += 1;
      clientesMap[cliId].total_facturado_mes += t.precio_cobrado;
    });
    pagos.forEach(p => {
      if (!p.cliente_id) return;
      const cliId = p.cliente_id._id.toString();
      if (clientesMap[cliId]) {
        clientesMap[cliId].abonos_mes += p.monto_pagado;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        periodo: `${mesStr}-${anio}`,
        total_turnos_operados: turnos.length,
        total_facturado_clientes: ingresosBrutos,
        total_costo_empleadas: costoTotalEmpleadas,
        utilidad_bruta: utilidadBruta,
        detalle_nomina: detalleNomina,
        detalle_clientes: Object.values(clientesMap)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar reporte global', error: error.message });
  }
};

// =========================================================================
// 4. PAGAR NÓMINA 
// =========================================================================
export const payEmployee = async (req, res) => {
  try {
    const { shiftIds, novedadIds } = req.body;

    if (shiftIds && shiftIds.length > 0) {
      await Shift.updateMany({ _id: { $in: shiftIds } }, { $set: { estado_pago_empleada: 'PAGADO' } });
    }
    if (novedadIds && novedadIds.length > 0) {
      await PayrollAdjustment.updateMany({ _id: { $in: novedadIds } }, { $set: { estado: 'APLICADO' } });
    }

    res.status(200).json({ success: true, message: 'Nómina pagada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};