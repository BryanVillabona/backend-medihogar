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

app.use(helmet()); 
app.use(cors()); 
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