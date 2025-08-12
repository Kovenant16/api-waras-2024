import express from 'express';
import {
    registrarNuevoCliente,
    verificarCodigoCliente,
    enviarCodigoVerificacion, // Importa la nueva función desde el servicio
    editarCliente,
    obtenerClientePorId,
    manejarPostVerificacion
} from '../services/clienteService.js';

import { registerOrUpdateFcmToken, removeFcmToken } from '../controllers/clienteController.js';

const router = express.Router();

// Ruta para registrar un nuevo cliente
router.post("/registrar", registrarNuevoCliente);

// Ruta para verificar el código de verificación ingresado por el cliente
router.post("/verificar-codigo", verificarCodigoCliente);

router.post("/post-verificacion", manejarPostVerificacion);

// Nueva ruta para enviar el código de verificación directamente
router.post("/enviar-codigo", enviarCodigoVerificacion); // Usa la función del servicio

// Ruta para editar un cliente
router.put('/:id', editarCliente);

// Ruta para registrar/actualizar FCM Token para un cliente
router.post('/:clienteId/fcm-token', /* protect, */ registerOrUpdateFcmToken);

// Ruta para eliminar FCM Token de un cliente
router.post('/:clienteId/fcm-token/remove', /* protect, */ removeFcmToken);



router.get('/obtenerCliente/:id', obtenerClientePorId);


export default router;
