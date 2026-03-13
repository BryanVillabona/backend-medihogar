import { z } from 'zod';

export const createShiftSchema = z.object({
  cliente_id: z.string().min(24, 'El ID del cliente debe ser un ObjectId válido'),
  paciente_id: z.string().min(24, 'El ID del paciente debe ser un ObjectId válido'),
  empleada_id: z.string().min(24, 'El ID de la empleada debe ser un ObjectId válido'),
  fecha_servicio: z.string().datetime({ message: 'La fecha debe tener un formato ISO 8601 válido (ej. 2026-02-21T08:00:00Z)' }),
  jornada: z.enum(['DIA', 'NOCHE'], { required_error: 'La jornada debe ser exactamente DIA o NOCHE' }),
  duracion_horas: z.number().int().positive('La duración debe ser un número positivo'),
  novedades: z.string().optional(),
  precio_cobrado_custom: z.number().optional(),
  costo_pagado_custom: z.number().optional(),
  pago_empleada_realizado: z.boolean().optional()
});