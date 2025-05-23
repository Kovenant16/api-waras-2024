import express from 'express';
import { crearEnvioPaquete } from '../controllers/envioPaqueteController.js';

const router = express.Router();


// Ruta para crear un nuevo envío de paquete

router.post('/', crearEnvioPaquete);

export default router;