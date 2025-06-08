import express from 'express';
import { crearEnvioPaquete,obtenerEnvioPaquetePorId } from '../controllers/envioPaqueteController.js';

const router = express.Router();


// Ruta para crear un nuevo envío de paquete

router.post('/', crearEnvioPaquete);
router.get('/:id', obtenerEnvioPaquetePorId);

export default router;