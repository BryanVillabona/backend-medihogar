import 'dotenv/config'; // Carga las variables de entorno automáticamente
import app from './app.js';
import { connectDB } from './config/database.js';

// Importamos el modelo de Usuario y bcrypt para el seeder
import User from './modules/users/user.model.js'; // Ajusta esta ruta si tu modelo está en otra carpeta
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 5000;

// =====================================================================
// FUNCIÓN SEMBRADORA (SEEDER): Crea el Super Admin si la BD está vacía
// =====================================================================
const crearAdminPorDefecto = async () => {
  try {
    const usuariosExisten = await User.countDocuments();

    if (usuariosExisten === 0) {
      console.log('🌱 Base de datos vacía detectada. Creando Super Administrador...');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('jorgoc5p', salt);

      const adminDefecto = new User({
        cedula: '0000000000',
        nombre_completo: 'Administrador Principal',
        celular: '0000000000',
        password: hashedPassword,
        rol_sistema: 'ADMIN',
        // Si tu esquema exige 'tipo_empleada', le ponemos 'NA' por ser Admin
        tipo_empleada: 'NA', 
        estado: true
      });

      await adminDefecto.save();
      console.log('✅ Super Administrador creado con éxito.');
      console.log('   📧 Correo: admin@medihogar.com');
      console.log('   🔑 Contraseña: admin123');
      console.log('   ⚠️ ¡Recuerda cambiar esta contraseña desde el panel de seguridad una vez ingreses!');
    }
  } catch (error) {
    console.error('❌ Error al crear el admin por defecto:', error.message);
  }
};

// =====================================================================
// Inicialización asíncrona del Servidor
// =====================================================================
const startServer = async () => {
  // 1. Primero nos conectamos a la BD
  await connectDB();
  
  // 2. Luego corremos el sembrador por si la BD está limpia
  await crearAdminPorDefecto();
  
  // 3. Finalmente levantamos el servidor
  app.listen(PORT, () => {
    console.log(`🚀 Servidor de Medihogar corriendo en http://localhost:${PORT}`);
  });
};

startServer();