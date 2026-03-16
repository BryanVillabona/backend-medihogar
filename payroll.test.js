// =====================================================================
// SIMULACIÓN DE LA FÓRMULA FINANCIERA DE MEDIHOGAR (CAJAS SEPARADAS)
// =====================================================================
// Extraemos la lógica matemática pura de tu controller para auditarla:

function calcularNetoAPagar({
  sueldo_turnos,
  bonos_totales,
  turnos_pagados,
  bonos_pagados,
  prestamos_totales,
  prestamos_aplicados
}) {
  const total_devengado = sueldo_turnos + bonos_totales;
  
  let pagos_ya_realizados = (turnos_pagados + bonos_pagados) - prestamos_aplicados;
  if (pagos_ya_realizados < 0) pagos_ya_realizados = 0;

  const total_deducido = pagos_ya_realizados + prestamos_totales;
  
  return total_devengado - total_deducido;
}

// =====================================================================
// EL ROBOT AUDITOR DE JEST (CASOS DE PRUEBA)
// =====================================================================

describe('Auditoría de Nómina: Fórmula de Cajas Separadas', () => {

  test('CASO 1: Empleada perfecta (Sin préstamos, todo pendiente)', () => {
    const resultado = calcularNetoAPagar({
      sueldo_turnos: 150000,
      bonos_totales: 20000,
      turnos_pagados: 0,
      bonos_pagados: 0,
      prestamos_totales: 0,
      prestamos_aplicados: 0
    });
    // Esperamos que le lleguen 170.000 exactos
    expect(resultado).toBe(170000);
  });

  test('CASO 2: Empleada con abonos previos (Ya se le adelantó plata)', () => {
    const resultado = calcularNetoAPagar({
      sueldo_turnos: 200000,
      bonos_totales: 0,
      turnos_pagados: 50000, // Ya le pagamos un turno de 50k
      bonos_pagados: 0,
      prestamos_totales: 0,
      prestamos_aplicados: 0
    });
    // De 200k, ya le dimos 50k. Debe dar 150.000
    expect(resultado).toBe(150000);
  });

  test('CASO 3: Empleada con un Préstamo fuerte (Descuento total)', () => {
    const resultado = calcularNetoAPagar({
      sueldo_turnos: 100000,
      bonos_totales: 0,
      turnos_pagados: 0,
      bonos_pagados: 0,
      prestamos_totales: 40000, // Pidió 40k prestados
      prestamos_aplicados: 0
    });
    // Produjo 100k, pero debe 40k. El cheque final es de 60.000
    expect(resultado).toBe(60000);
  });

  test('CASO 4: El escenario complejo (Cruce de Deudas y Abonos)', () => {
    const resultado = calcularNetoAPagar({
      sueldo_turnos: 300000, // Produjo 300k
      bonos_totales: 50000,  // Bono de 50k (Total devengado = 350k)
      turnos_pagados: 100000,// Ya le mandamos 100k a Nequi antes
      bonos_pagados: 50000,  // Ya le pagamos el bono de 50k
      prestamos_totales: 200000, // Nos debe 200k
      prestamos_aplicados: 150000 // De esos 200k, 150k ya se cruzaron con pagos anteriores
    });
    
    // Matemática real:
    // Devengado: 350k
    // Pagos ya realizados reales: (100k + 50k) - 150k = 0 efectivo entregado
    // Total Deducido: 0 + 200k prestados = 200k
    // Neto = 350k - 200k = 150k a pagar
    expect(resultado).toBe(150000);
  });

});