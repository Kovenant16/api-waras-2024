import express from 'express';
import {
    registrarCliente,
    buscarClientesPorTelefono,
    verificarCodigoCliente // Asegúrate de importar esta función
} from '../controllers/clienteController.js';
import checkAuth from '../middleware/checkAuth.js'; // Si tienes middleware de autenticación

const router = express.Router();

router.post("/registrar", registrarCliente);
router.post("/buscar", buscarClientesPorTelefono);
router.post("/verificar-codigo", verificarCodigoCliente); // Nueva ruta para verificar el código

export default router;