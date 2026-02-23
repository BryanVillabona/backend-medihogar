import { Schema, model } from 'mongoose';

const payrollAdjustmentSchema = new Schema({
  empleada_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo_movimiento: {
    type: String,
    enum: ['INGRESO', 'EGRESO'], // INGRESO = Bonos, Transportes | EGRESO = Préstamos, Faltas
    required: true
  },
  concepto: {
    type: String,
    required: true,
    trim: true // Ej. "Préstamo personal", "Bono fin de año"
  },
  monto: {
    type: Number,
    required: true
  },
  fecha_aplicacion: {
    type: Date,
    required: true // Define en qué mes/quincena se le va a cobrar o pagar esto
  },
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APLICADO', 'ANULADO'],
    default: 'PENDIENTE' // Pasa a APLICADO cuando se genere el pago mensual
  }
}, { timestamps: true });

export default model('PayrollAdjustment', payrollAdjustmentSchema);