import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  nombre_completo: {
    type: String,
    required: true,
    trim: true,
    index: true // 🚀 ÍNDICE: Para búsquedas rápidas por nombre en el buscador del panel de Personal
  },
  cedula: {
    type: String,
    required: true,
    unique: true // 🚀 UNIQUE: Ya crea un índice automático. Hace que el inicio de sesión sea instantáneo.
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  rol_sistema: {
    type: String,
    enum: ['ADMIN', 'ADMIN_FINANZAS', 'ADMIN_TURNOS', 'EMPLEADA'],
    default: 'EMPLEADA',
    index: true // 🚀 ÍNDICE: Permite al backend separar rápidamente a las administradoras de las enfermeras
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
    default: true,
    index: true // 🚀 ÍNDICE: Vital para omitir al personal inactivo en milisegundos sin leer toda la base de datos
  }
}, { timestamps: true });

// 🌟 EL SÚPER ÍNDICE COMPUESTO 🌟
// Esta es la consulta más repetida en tu sistema al programar turnos:
// "Tráeme a todos los que sean EMPLEADA y que estén ACTIVAS".
userSchema.index({ rol_sistema: 1, estado_activa: 1 });

export default model('User', userSchema);