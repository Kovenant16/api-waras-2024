// routes/appPedidoRoutes.js

import express from 'express';
import { crearPedidoApp } from '../controllers/appPedidoController.js';

const router = express.Router();

// Ruta para crear un nuevo pedido desde la aplicación
// Se recomienda proteger esta ruta para que solo usuarios autenticados puedan crear pedidos
router.post('/',  crearPedidoApp); // `protect` es tu middleware de autenticación

export default router;