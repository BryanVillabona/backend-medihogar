// =====================================================================
// 1. SIMULACIÓN DE LA FÓRMULA MATEMÁTICA PURA
// =====================================================================
function calcularNetoAPagar({ sueldo_turnos, bonos_totales, turnos_pagados, bonos_pagados, prestamos_totales, prestamos_aplicados }) {
  const total_devengado = sueldo_turnos + bonos_totales;
  let pagos_ya_realizados = (turnos_pagados + bonos_pagados) - prestamos_aplicados;
  if (pagos_ya_realizados < 0) pagos_ya_realizados = 0;
  const total_deducido = pagos_ya_realizados + prestamos_totales;
  return total_devengado - total_deducido;
}

// =====================================================================
// 2. NUEVO: SIMULACIÓN DEL FILTRO ANTI-FRAUDE (Lógica de Negocio)
// =====================================================================
function procesarNomina(listaTurnos, listaAdelantos) {
  let total_a_pagar = 0;
  let alertas_fraude = [];

  for (const turno of listaTurnos) {
    // REGLA 1: No se puede pagar un turno que no esté FINALIZADO
    if (turno.estado_turno !== 'FINALIZADO') {
      alertas_fraude.push(`Bloqueo: El turno ${turno.id} tiene estado ${turno.estado_turno}.`);
      continue; // Saltamos este turno, no lo sumamos
    }
    
    // REGLA 2: No se puede pagar un turno que ya fue PAGADO (Evita doble pago)
    if (turno.estado_pago_empleada !== 'PENDIENTE') {
      alertas_fraude.push(`Bloqueo: El turno ${turno.id} ya figura como ${turno.estado_pago_empleada}.`);
      continue;
    }

    // REGLA 3: Los valores negativos son inválidos (Error de tipeo)
    if (turno.costo_pagado < 0) {
      alertas_fraude.push(`Bloqueo: El turno ${turno.id} tiene un valor negativo ($${turno.costo_pagado}).`);
      continue;
    }

    // Si pasa todas las reglas de seguridad, lo sumamos al total
    total_a_pagar += turno.costo_pagado;
  }

  const total_adelantos = listaAdelantos.reduce((sum, ad) => sum + ad.valor, 0);

  let neto_final = total_a_pagar - total_adelantos;
  if (neto_final < 0) neto_final = 0; // Si debe más de lo que ganó, el cheque sale en $0

  return { neto_a_pagar: neto_final, alertas_fraude };
}

// =====================================================================
// EL ROBOT AUDITOR DE JEST (CASOS DE PRUEBA)
// =====================================================================

describe('Auditoría Nivel 1: Fórmula Matemática', () => {
  test('La fórmula debe cruzar deudas y abonos correctamente', () => {
    const resultado = calcularNetoAPagar({
      sueldo_turnos: 300000, bonos_totales: 50000, turnos_pagados: 100000,
      bonos_pagados: 50000, prestamos_totales: 200000, prestamos_aplicados: 150000
    });
    expect(resultado).toBe(150000);
  });
});

describe('Auditoría Nivel 2: Motor Anti-Fraude de Nómina', () => {
  
  test('CASO 1: Intento de Doble Pago (Excel lo permitiría, el sistema NO)', () => {
    const turnos = [
      { id: 'T-001', estado_turno: 'FINALIZADO', estado_pago_empleada: 'PENDIENTE', costo_pagado: 50000 },
      { id: 'T-002', estado_turno: 'FINALIZADO', estado_pago_empleada: 'PAGADO', costo_pagado: 50000 } // <-- Intento de doble pago
    ];
    
    const resultado = procesarNomina(turnos, []);
    
    // Solo debe sumar los 50k del turno pendiente, ignorando el que ya se pagó.
    expect(resultado.neto_a_pagar).toBe(50000);
    // Debe generar 1 alerta informando del intento de doble pago
    expect(resultado.alertas_fraude.length).toBe(1);
    expect(resultado.alertas_fraude[0]).toContain('ya figura como PAGADO');
  });

  test('CASO 2: Liquidar Turnos Cancelados o Futuros (Excel lo permitiría, el sistema NO)', () => {
    const turnos = [
      { id: 'T-003', estado_turno: 'PROGRAMADO', estado_pago_empleada: 'PENDIENTE', costo_pagado: 60000 }, // Aún no ocurre
      { id: 'T-004', estado_turno: 'CANCELADO', estado_pago_empleada: 'PENDIENTE', costo_pagado: 60000 },  // Fue cancelado
      { id: 'T-005', estado_turno: 'FINALIZADO', estado_pago_empleada: 'PENDIENTE', costo_pagado: 60000 }  // El único válido
    ];
    
    const resultado = procesarNomina(turnos, []);
    
    // Solo debe sumar el T-005. El total debe ser 60.000.
    expect(resultado.neto_a_pagar).toBe(60000);
    // Debe atrapar los 2 turnos inválidos
    expect(resultado.alertas_fraude.length).toBe(2);
  });

  test('CASO 3: Error de Dedo con Números Negativos (Fat Finger)', () => {
    const turnos = [
      { id: 'T-006', estado_turno: 'FINALIZADO', estado_pago_empleada: 'PENDIENTE', costo_pagado: 50000 },
      { id: 'T-007', estado_turno: 'FINALIZADO', estado_pago_empleada: 'PENDIENTE', costo_pagado: -10000 } // Error de tipeo
    ];
    
    const resultado = procesarNomina(turnos, []);
    
    // No debe restar los 10k. Debe ignorar el turno corrupto y pagar solo los 50k limpios.
    expect(resultado.neto_a_pagar).toBe(50000);
    expect(resultado.alertas_fraude[0]).toContain('valor negativo');
  });

  test('CASO 4: Préstamo mayor al sueldo (Prevención de saldo negativo a la empleada)', () => {
    const turnos = [
      { id: 'T-008', estado_turno: 'FINALIZADO', estado_pago_empleada: 'PENDIENTE', costo_pagado: 50000 }
    ];
    const adelantos = [
      { id: 'P-001', valor: 80000 } // Pidió 80k prestados, pero solo produjo 50k
    ];
    
    const resultado = procesarNomina(turnos, adelantos);
    
    // El sistema NUNCA debe arrojar "-30000" a pagar. Debe arrojar "0".
    // La deuda restante quedará guardada en la base de datos para la próxima quincena.
    expect(resultado.neto_a_pagar).toBe(0);
  });

});