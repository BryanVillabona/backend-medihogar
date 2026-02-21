import { z } from 'zod';

export const createServiceSchema = z.object({
  rol_requerido: z.enum(['AUXILIAR', 'CUIDADORA']),
  duracion_horas: z.union([z.literal(10), z.literal(12), z.literal(24)], {
    errorMap: () => ({ message: 'La duración debe ser 10, 12 o 24' })
  }),
  precio_cobrado_cliente: z.number().positive('El precio debe ser un número positivo'),
  costo_pagado_empleada: z.number().positive('El costo debe ser un número positivo')
});