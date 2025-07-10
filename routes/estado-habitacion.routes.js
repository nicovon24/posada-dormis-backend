import { Router } from 'express';
import { EstadoHabitacion } from '../models/estadoHabitacion.js';
const router = Router();
router.get('/', async (_, res) => res.json(await EstadoHabitacion.findAll()));
export default router;
