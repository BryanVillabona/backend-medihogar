import { z } from 'zod';

export const createServiceSchema = z.object({
  rol_requerido: z.enum(['AUXILIAR', 'CUIDADORA']),
  duracion_horas: z.number().positive('La duración debe ser un número mayor a 0'), // Flexibilidad total
  precio_cobrado_cliente: z.number().positive('El precio debe ser un número positivo'),
  costo_pagado_empleada: z.number().positive('El costo debe ser un número positivo'),
  estado: z.boolean().optional() // Permitimos que el frontend envíe cambios de estado
});