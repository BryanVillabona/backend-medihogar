import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  cliente_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  monto_pagado: {
    type: Number,
    required: true
  },
  metodo_pago: {
    type: String,
    enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'],
    required: true
  },
  fecha_pago: {
    type: Date,
    default: Date.now
  },
  referencia: {
    type: String, // Útil para guardar el número de comprobante del banco
    default: ''
  }
}, { timestamps: true });

export default model('Payment', paymentSchema);