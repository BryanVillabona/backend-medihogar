import { z } from 'zod';

export const createUserSchema = z.object({
  nombre_completo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  cedula: z.string().min(5, 'La cédula debe ser válida'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rol_sistema: z.enum(['ADMIN', 'EMPLEADA']).optional(),
  tipo_empleada: z.enum(['AUXILIAR_FIJA', 'CUIDADORA_FIJA', 'TURNADORA', 'NA'], {
    required_error: 'El tipo de empleada es obligatorio'
  }),
  telefono: z.string().optional(),
  estado: z.boolean().optional(),
  estado_activa: z.boolean().optional()
});