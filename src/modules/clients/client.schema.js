import { z } from 'zod';

export const createClientSchema = z.object({
  nombre_responsable: z.string().min(3, 'El nombre del responsable es obligatorio'),
  documento_responsable: z.string().min(5, 'El documento es obligatorio'),
  telefono_contacto: z.string().min(7, 'El teléfono es obligatorio'),
  
  // Agrupamos al paciente en un arreglo, manteniendo tus validaciones originales
  pacientes: z.array(
    z.object({
      nombre_paciente: z.string().min(3, 'El nombre del paciente es obligatorio'),
      direccion_servicio: z.string().min(5, 'La dirección es obligatoria'),
      estado_activo: z.boolean().optional().default(true)
    })
  ).min(1, 'Debe agregar al menos un paciente')
});