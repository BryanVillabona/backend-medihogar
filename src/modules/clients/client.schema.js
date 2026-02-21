import { z } from 'zod';

export const createClientSchema = z.object({
  nombre_responsable: z.string().min(3, 'El nombre del responsable es obligatorio'),
  documento_responsable: z.string().min(5, 'El documento es obligatorio'),
  nombre_paciente: z.string().min(3, 'El nombre del paciente es obligatorio'),
  telefono_contacto: z.string().min(7, 'El teléfono es obligatorio'),
  direccion_servicio: z.string().min(5, 'La dirección es obligatoria')
});