import { Schema, model } from 'mongoose';

// 1. Creamos el sub-esquema para los pacientes
const pacienteSchema = new Schema({
  nombre_paciente: {
    type: String,
    required: true,
    trim: true,
    index: true // 🚀 ÍNDICE: Acelera la búsqueda cuando escribes el nombre del paciente en el buscador
  },
  direccion_servicio: {
    type: String,
    required: true
  },
  estado_activo: {
    type: Boolean,
    default: true
  }
});

// 2. Esquema principal del Cliente (Responsable)
const clientSchema = new Schema({
  nombre_responsable: {
    type: String,
    required: true,
    trim: true,
    index: true // 🚀 ÍNDICE: Para búsquedas rápidas por el nombre del titular
  },
  documento_responsable: {
    type: String,
    required: true,
    unique: true // 🚀 UNIQUE: Índice automático. Vital para evitar duplicados y acelerar búsquedas por cédula.
  },
  telefono_contacto: {
    type: String,
    required: true
  },
  // --- ZONA FINANCIERA ---
  saldo_pendiente: {
    type: Number,
    default: 0,
    index: true // 🚀 ÍNDICE: Para que el sistema sepa al instante quién debe dinero (Filtro "Con Deuda")
  },
  // -----------------------
  estado_activo: {
    type: Boolean,
    default: true,
    index: true // 🚀 ÍNDICE: Separa rápidamente a los clientes activos de los inactivos
  },
  // 3. Agregamos el arreglo de pacientes
  pacientes: [pacienteSchema]
}, { timestamps: true });

// 🌟 EL SÚPER ÍNDICE COMPUESTO 🌟
// Esta combinación es oro puro para tu filtro "Con Deuda" (Que solo muestra clientes activos con saldo mayor a 0).
clientSchema.index({ estado_activo: 1, saldo_pendiente: 1 });

export default model('Client', clientSchema);