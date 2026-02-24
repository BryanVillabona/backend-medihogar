import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import userRoutes from './modules/users/user.routes.js'; 
import catalogRoutes from './modules/catalog/catalog.routes.js'; 
import clientRoutes from './modules/clients/client.routes.js'; 
import shiftRoutes from './modules/shifts/shift.routes.js';
// 1. Importamos facturación
import billingRoutes from './modules/billing/billing.routes.js';

import authRoutes from './modules/auth/auth.routes.js';

const app = express();

// 👇 NUEVO: ESCUDO CORS (Lista Blanca de Dominios) 👇
const dominiosPermitidos = [
  'https://frontend-medihogar.vercel.app', // Tu sitio en producción
  'http://localhost:5173'                  // Tu computadora local para pruebas
];

app.use(helmet()); 
app.use(cors({
  origin: function (origin, callback) {
    // Si no hay origen (como un script de servidor local) o si está en la lista blanca, lo dejamos pasar
    if (!origin || dominiosPermitidos.includes(origin)) {
      callback(null, true);
    } else {
      // Si otra página web intenta consumir tu API, la bloqueamos
      callback(new Error('Bloqueado por CORS: Dominio no autorizado'));
    }
  },
  credentials: true
})); 
// 👆 ============================================== 👆

app.use(express.json()); 
app.use(morgan('dev')); 

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API Medihogar funcionando al 100%' });
});

app.use('/api/users', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/shifts', shiftRoutes);
// 2. Montamos el módulo
app.use('/api/billing', billingRoutes);
app.use('/api/auth', authRoutes);

export default app;