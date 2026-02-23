import mongoose from 'mongoose';
import Payment from './payment.model.js';
import Client from '../clients/client.model.js';

export const registerPayment = async (req, res) => {
  // 1. Iniciamos la sesión para la transacción
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { cliente_id, monto_pagado, metodo_pago, referencia } = req.body;

    // Validamos el cliente (pasándole la sesión)
    const cliente = await Client.findById(cliente_id).session(session);
    if (!cliente) {
      // Si falla, abortamos todo
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    // 2. Creamos el registro del pago dentro de la sesión
    const nuevoPago = new Payment({
      cliente_id,
      monto_pagado,
      metodo_pago,
      referencia
    });

    // Guardamos pasando la sesión como un array (requerimiento de Mongoose)
    const pagoGuardado = await nuevoPago.save({ session });

    // 3. Actualizamos el saldo pendiente del cliente dentro de la sesión
    const clienteActualizado = await Client.findByIdAndUpdate(
      cliente_id,
      { $inc: { saldo_pendiente: -Math.abs(monto_pagado) } },
      { new: true, session } // Pasamos la sesión aquí también
    );

    // 4. Si TODO salió bien hasta aquí, confirmamos los cambios en la BD (Commit)
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Pago registrado y saldo actualizado correctamente',
      data: {
        recibo: pagoGuardado,
        nuevo_saldo_cliente: clienteActualizado.saldo_pendiente
      }
    });

  } catch (error) {
    // 🚨 Si CUALQUIER error ocurre (ej. falla la red en el paso 3),
    // revertimos el paso 2 para que no queden pagos fantasmas guardados.
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      success: false,
      message: 'Error crítico al registrar el pago. Transacción revertida.',
      error: error.message
    });
  }
};