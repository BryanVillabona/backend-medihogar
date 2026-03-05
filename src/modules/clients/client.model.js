import { Schema, model } from 'mongoose';

// 1. Creamos el sub-esquema para los pacientes
const pacienteSchema = new Schema({
  nombre_paciente: {
    type: String,
    required: true,
    trim: true
  },
  direccion_servicio: {
    type: String,
    required: true
  },
  estado_activo: {
    type: Boolean,
    default: true // Permite desactivar un paciente individual (ej. si fallece)
  }
});

// 2. Esquema principal del Cliente (Responsable)
const clientSchema = new Schema({
  nombre_responsable: {
    type: String,
    required: true,
    trim: true
  },
  documento_responsable: {
    type: String,
    required: true,
    unique: true // Como ahora agrupamos, está perfecto que la cédula sea única
  },
  telefono_contacto: {
    type: String,
    required: true
  },
  // --- ZONA FINANCIERA ---
  saldo_pendiente: {
    type: Number,
    default: 0 
  },
  // -----------------------
  estado_activo: {
    type: Boolean,
    default: true // Permite desactivar a TODO el responsable y sus pacientes
  },
  // 3. Agregamos el arreglo de pacientes
  pacientes: [pacienteSchema]
}, { timestamps: true });

export default model('Client', clientSchema);