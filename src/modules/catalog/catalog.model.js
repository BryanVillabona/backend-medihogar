import { Schema, model } from 'mongoose';

const catalogSchema = new Schema({
  rol_requerido: {
    type: String,
    enum: ['AUXILIAR', 'CUIDADORA'],
    required: true
  },
  duracion_horas: {
    type: Number,
    enum: [10, 12, 24], // Restringimos para evitar errores de tipeo
    required: true
  },
  precio_cobrado_cliente: {
    type: Number,
    required: true
  },
  costo_pagado_empleada: {
    type: Number,
    required: true
  },
  estado: {
    type: Boolean,
    default: true // Por si en el futuro descontinúan un servicio, lo apagamos en vez de borrarlo
  }
}, { timestamps: true });

export default model('Catalog', catalogSchema);