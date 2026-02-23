import { Schema, model } from 'mongoose';

const shiftSchema = new Schema({
  cliente_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
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
    required: true // Ej. 10 o 12
  },
  // NUEVO: Fundamental para personal flotante (Turnadoras)
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
  // ------------------------------------------
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