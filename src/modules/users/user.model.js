import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  nombre_completo: {
    type: String,
    required: true,
    trim: true
  },
  cedula: {
    type: String,
    required: true,
    unique: true // No pueden existir dos empleadas con la misma cédula
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  rol_sistema: {
    type: String,
    enum: ['ADMIN', 'ADMIN_FINANZAS', 'ADMIN_TURNOS', 'EMPLEADA'],
    default: 'EMPLEADA'
  },
  tipo_empleada: {
    type: String,
    enum: ['AUXILIAR_FIJA', 'CUIDADORA_FIJA', 'TURNADORA', 'NA'], // NA para los ADMIN
    required: true
  },
  telefono: {
    type: String
  },
  estado_activa: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default model('User', userSchema);