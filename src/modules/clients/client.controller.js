import Client from './client.model.js';

// Registrar un nuevo cliente/paciente
export const createClient = async (req, res) => {
  try {
    const clientData = req.body;
    const newClient = new Client(clientData);
    const savedClient = await newClient.save();

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: savedClient
    });
  } catch (error) {
    // Si envías un documento repetido, Mongoose atrapará el error por el 'unique: true'
    res.status(400).json({
      success: false,
      message: 'Error al registrar el cliente',
      error: error.message
    });
  }
};

// Obtener todos los clientes activos
export const getActiveClients = async (req, res) => {
  try {
    const clients = await Client.find({ estado_activo: true });
    
    res.status(200).json({
      success: true,
      data: clients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener los clientes',
      error: error.message
    });
  }
};