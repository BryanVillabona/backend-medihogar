import 'dotenv/config'; // Carga las variables de entorno automáticamente
import app from './app.js';
import { connectDB } from './config/database.js';

const PORT = process.env.PORT || 5000;

// Inicialización asíncrona
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor de Medihogar corriendo en http://localhost:${PORT}`);
  });
};

startServer();