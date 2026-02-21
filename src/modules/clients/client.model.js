import { Schema, model } from 'mongoose';

const clientSchema = new Schema({
  nombre_responsable: {
    type: String,
    required: true,
    trim: true
  },
  documento_responsable: {
    type: String,
    required: true,
    unique: true
  },
  nombre_paciente: {
    type: String,
    required: true,
    trim: true
  },
  telefono_contacto: {
    type: String,
    required: true
  },
  direccion_servicio: {
    type: String, // Fundamental para saber a dónde enviar a la empleada
    required: true
  },
  // --- ZONA FINANCIERA ---
  saldo_pendiente: {
    type: Number,
    default: 0 // Inicia en 0. Sumará con cada turno completado, restará con cada pago.
  },
  // -----------------------
  estado_activo: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default model('Client', clientSchema);