import express from 'express';
import {
    registrarNuevoCliente,
    verificarCodigoCliente,
} from '../services/clienteService.js'; // Importa el servicio

const router = express.Router();

router.post("/registrar", registrarNuevoCliente); // Usa la función del servicio
router.post("/verificar-codigo", verificarCodigoCliente);
// Otras rutas de cliente (obtener, actualizar, eliminar) irían aquí

export default router;
