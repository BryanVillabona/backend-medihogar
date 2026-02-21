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
    enum: ['DIA', 'NOCHE'], // ¡Aquí está la regla de negocio que mencionaste!
    required: true
  },
  duracion_horas: {
    type: Number,
    required: true // Ej. 10 o 12
  },
  // --- ZONA FINANCIERA (DATOS CONGELADOS) ---
  // Estos datos se copian del Catálogo en el momento de crear el turno
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
    type: String, // Por si llegó tarde, o si le dieron un auxilio extra de transporte
    default: ''
  },
  estado_turno: {
    type: String,
    enum: ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'],
    default: 'PROGRAMADO'
  }
}, { timestamps: true });

export default model('Shift', shiftSchema);