import Payment from './payment.model.js';
import Client from '../clients/client.model.js';

export const registerPayment = async (req, res) => {
  try {
    const { cliente_id, monto_pagado, metodo_pago, referencia } = req.body;

    // 1. Validamos que el cliente exista
    const cliente = await Client.findById(cliente_id);
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    // 2. Creamos el registro del pago (El comprobante)
    const nuevoPago = new Payment({
      cliente_id,
      monto_pagado,
      metodo_pago,
      referencia
    });

    const pagoGuardado = await nuevoPago.save();

    // 3. ¡Magia financiera a la inversa! Le RESTAMOS el pago al saldo pendiente
    // Pasamos el monto en negativo para que $inc lo reste
    const clienteActualizado = await Client.findByIdAndUpdate(
      cliente_id,
      { $inc: { saldo_pendiente: -Math.abs(monto_pagado) } },
      { new: true } // Esto hace que Mongoose nos devuelva el cliente con el saldo ya actualizado
    );

    // 4. Respondemos con el éxito de la operación
    res.status(201).json({
      success: true,
      message: 'Pago registrado correctamente',
      data: {
        recibo: pagoGuardado,
        nuevo_saldo_cliente: clienteActualizado.saldo_pendiente
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al registrar el pago',
      error: error.message
    });
  }
};