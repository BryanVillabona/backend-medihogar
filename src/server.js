import 'dotenv/config'; // Carga las variables de entorno automáticamente
import http from 'http'; // <--- NUEVO: Importar http nativo de Node
import { Server } from 'socket.io'; // <--- NUEVO: Importar Server de socket.io
import app from './app.js';
import { connectDB } from './config/database.js';

// Importamos el modelo de Usuario y bcrypt para el seeder
import User from './modules/users/user.model.js'; 
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 5000;

// =====================================================================
// CONFIGURACIÓN DE WEBSOCKETS (SOCKET.IO)
// =====================================================================
const server = http.createServer(app); // Envolvemos la app de Express en un servidor HTTP

const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexiones desde el frontend
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

// Guardamos la instancia de 'io' en la app para poder usarla en cualquier controlador
app.set('io', io);

// Escuchamos las conexiones en tiempo real
io.on('connection', (socket) => {
  console.log('🟢 Nuevo dispositivo conectado en tiempo real:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔴 Dispositivo desconectado:', socket.id);
  });
});

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
        tipo_empleada: 'NA', 
        estado: true
      });

      await adminDefecto.save();
      console.log('✅ Super Administrador creado con éxito.');
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
  
  // 3. Finalmente levantamos el servidor (¡USAMOS server.listen, NO app.listen!)
  server.listen(PORT, () => {
    console.log(`🚀 Servidor y WebSockets corriendo en http://localhost:${PORT}`);
  });
};

startServer();