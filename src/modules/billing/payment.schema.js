import { z } from 'zod';

export const registerPaymentSchema = z.object({
  cliente_id: z.string().min(24, 'ID de cliente inválido'),
  monto_pagado: z.number().positive('El monto debe ser mayor a cero'),
  metodo_pago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']),
  referencia: z.string().optional()
});