import { Router } from 'express';
import { createUser, getUsers } from './user.controller.js';

const router = Router();

// POST /api/users -> Para registrar un usuario/empleada
router.post('/', createUser);

// GET /api/users -> Para listar todos los usuarios
router.get('/', getUsers);

export default router;