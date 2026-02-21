import { z } from 'zod';

export const loginSchema = z.object({
  cedula: z.string().min(1, 'La cédula es obligatoria'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});