import { Schema, model } from 'mongoose';

const shiftSchema = new Schema({
  cliente_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  paciente_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  empleada_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fecha_servicio: {
    type: Date,
    required: true
  },
  jornada: {
    type: String,
    enum: ['DIA', 'NOCHE'],
    required: true
  },
  duracion_horas: {
    type: Number,
    required: true // Ahora aceptará 1, 2, 3... cualquier duración.
  },
  rol_ejercido: {
    type: String,
    enum: ['AUXILIAR', 'CUIDADORA'],
    required: true
  },
  // --- ZONA FINANCIERA (DATOS CONGELADOS) ---
  precio_cobrado: {
    type: Number,
    required: true 
  },
  costo_pagado: {
    type: Number,
    required: true
  },
  // 👇 CAMBIO CLAVE: Reemplazamos el booleano por un Estado de Pago 👇
  estado_pago_empleada: {
    type: String,
    enum: ['PENDIENTE', 'PAGADO'],
    default: 'PENDIENTE'
  },
  novedades: {
    type: String,
    default: ''
  },
  estado_turno: {
    type: String,
    enum: ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'],
    default: 'PROGRAMADO'
  }
}, { timestamps: true });

export default model('Shift', shiftSchema);