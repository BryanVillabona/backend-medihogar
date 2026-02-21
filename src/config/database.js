import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    // La URI vendrá de tu archivo .env
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🔥 MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
    process.exit(1); // Detiene la app si no hay base de datos (Fail Fast)
  }
};