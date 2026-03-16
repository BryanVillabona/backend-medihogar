import Client from './client.model.js';
import { catchAsync } from '../../core/utils/catchAsync.js';

// Registrar un nuevo cliente/paciente
export const createClient = catchAsync(async (req, res) => {
  const clientData = req.body;
  const newClient = new Client(clientData);
  const savedClient = await newClient.save();

  res.status(201).json({
    success: true,
    message: 'Cliente registrado exitosamente',
    data: savedClient
  });
});

// Obtener TODOS los clientes (El frontend se encarga de filtrar en sus pestañas)
// 👇 Respetamos tu nombre original para no romper las rutas
export const getActiveClients = catchAsync(async (req, res) => {
  const clients = await Client.find();
  
  res.status(200).json({
    success: true,
    data: clients
  });
});

export const updateClient = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  // El {new: true} es para que MongoDB nos devuelva el dato ya actualizado
  const clienteActualizado = await Client.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  
  if (!clienteActualizado) {
    return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
  }
  
  res.status(200).json({ 
    success: true, 
    message: 'Cliente actualizado correctamente',
    data: clienteActualizado 
  });
});