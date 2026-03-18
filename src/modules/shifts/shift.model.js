import { Schema, model } from 'mongoose';

const shiftSchema = new Schema({
  cliente_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true // 🚀 ÍNDICE: Acelera la búsqueda de turnos por cliente
  },
  paciente_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  empleada_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // 🚀 ÍNDICE: Vital para que las enfermeras carguen su agenda al instante
  },
  fecha_servicio: {
    type: Date,
    required: true,
    index: -1 // 🚀 ÍNDICE DESCENDENTE: Optimizadísimo para tu nuevo filtro "Desde-Hasta" y para ordenar del más nuevo al más viejo
  },
  jornada: {
    type: String,
    enum: ['DIA', 'NOCHE'],
    required: true
  },
  duracion_horas: {
    type: Number,
    required: true 
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
  estado_pago_empleada: {
    type: String,
    enum: ['PENDIENTE', 'PAGADO'],
    default: 'PENDIENTE',
    index: true // 🚀 ÍNDICE: Hace que la pestaña "Por Liquidar" cargue en milisegundos
  },
  novedades: {
    type: String,
    default: ''
  },
  estado_turno: {
    type: String,
    enum: ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'],
    default: 'PROGRAMADO',
    index: true // 🚀 ÍNDICE: Acelera la separación entre Activos y el Historial
  }
}, { timestamps: true });

// 🌟 EL SÚPER ÍNDICE (Índice Compuesto) 🌟
// MongoDB usará este índice combinado cuando el backend busque: 
// "Tráeme los turnos de esta fecha EXACTA que le pertenecen a esta ENFERMERA"
shiftSchema.index({ fecha_servicio: -1, empleada_id: 1 });

export default model('Shift', shiftSchema);