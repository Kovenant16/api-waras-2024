import express from 'express';
import {
    registrarNuevoCliente,
    verificarCodigoCliente,
    enviarCodigoVerificacion, // Importa la nueva función desde el servicio
    editarCliente
} from '../services/clienteService.js';

const router = express.Router();

// Ruta para registrar un nuevo cliente
router.post("/registrar", registrarNuevoCliente);

// Ruta para verificar el código de verificación ingresado por el cliente
router.post("/verificar-codigo", verificarCodigoCliente);

// Nueva ruta para enviar el código de verificación directamente
router.post("/enviar-codigo", enviarCodigoVerificacion); // Usa la función del servicio

// Ruta para editar un cliente
router.put('/clientes/:id', editarCliente);


export default router;
