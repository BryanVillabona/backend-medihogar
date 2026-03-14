import { Schema, model } from 'mongoose';

const catalogSchema = new Schema({
  rol_requerido: {
    type: String,
    enum: ['AUXILIAR', 'CUIDADORA'],
    required: true
  },
  duracion_horas: {
    type: Number,
    required: true,
    min: [1, 'La duración debe ser de al menos 1 hora'] // Reemplazamos el enum estricto por un mínimo lógico
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
    default: true // Mantenemos el estado por defecto activo
  }
}, { timestamps: true });

export default model('Catalog', catalogSchema);