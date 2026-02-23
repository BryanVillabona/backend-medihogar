import Catalog from './catalog.model.js';

// Crear un nuevo servicio con sus precios base
export const createService = async (req, res) => {
  try {
    const serviceData = req.body;
    const newService = new Catalog(serviceData);
    const savedService = await newService.save();

    res.status(201).json({
      success: true,
      message: 'Servicio creado en el catálogo',
      data: savedService
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al crear el servicio',
      error: error.message
    });
  }
};

// Obtener todos los servicios activos (Para el frontend en React)
export const getActiveServices = async (req, res) => {
  try {
    // Solo traemos los que están activos. Si un servicio se discontinua, no lo mostramos.
    const services = await Catalog.find({ estado: true });
    
    res.status(200).json({
      success: true,
      data: services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el catálogo',
      error: error.message
    });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedService = await Catalog.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ success: true, data: updatedService });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar tarifa' });
  }
};