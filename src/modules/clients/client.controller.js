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
    // 👇 NUEVO: Interceptamos el error de cédula duplicada para mejorar la UX 👇
    if (error.code === 11000 && error.keyPattern && error.keyPattern.documento_responsable) {
      return res.status(400).json({
        success: false,
        message: 'Este responsable (cédula) ya existe. Búscalo en la lista y usa el botón editar para agregarle más pacientes.'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Error al registrar el cliente',
      error: error.message
    });
  }
};

// Obtener TODOS los clientes (El frontend se encarga de filtrar en sus pestañas)
export const getActiveClients = async (req, res) => {
  try {
    // 👇 CORRECCIÓN: Quitamos el filtro { estado_activo: true } para liberar a los inactivos 👇
    const clients = await Client.find();
    
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

export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // El {new: true} es para que MongoDB nos devuelva el dato ya actualizado
    // Al mandar el nuevo arreglo de "pacientes" en req.body, Mongoose lo actualiza automáticamente
    const clienteActualizado = await Client.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    
    if (!clienteActualizado) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Cliente actualizado correctamente',
      data: clienteActualizado 
    });
  } catch (error) {
    // Por si intentan editar a un responsable poniéndole la cédula de otro
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'El documento ingresado ya pertenece a otro responsable.' });
    }

    res.status(500).json({ success: false, message: 'Error al actualizar cliente', error: error.message });
  }
};