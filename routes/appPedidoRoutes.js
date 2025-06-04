// routes/appPedidoRoutes.js

import express from 'express';
import {
    crearPedidoApp,
    obtenerPedidoAppPorId,
    obtenerPedidosEnTransito,
    obtenerPedidosPorUsuario,
    obtenerPedidosPorTienda
} from '../controllers/appPedidoController.js';

// Si tienes un middleware de autenticación, impórtalo aquí.
// Por ejemplo:
// import protect from '../middleware/authMiddleware.js'; // Asumiendo que tienes un middleware 'protect'

const router = express.Router();

// ======================================================
// Rutas para Pedidos de la Aplicación (AppPedidos)
// ======================================================

// Ruta para crear un nuevo pedido desde la aplicación
// POST /api/appPedidos
// Se recomienda proteger esta ruta para que solo usuarios autenticados puedan crear pedidos.
// router.post('/', protect, crearPedidoApp); // Ejemplo con middleware de protección
router.post('/', crearPedidoApp); // Versión sin protección (para desarrollo/pruebas iniciales)

// Ruta para obtener un pedido específico por su ID
// GET /api/appPedidos/:id
// Esta ruta podría ser accesible por el usuario que hizo el pedido, un administrador o la tienda.
// Se recomienda protegerla y validar que el usuario tenga permisos para ver ese pedido.
router.get('/:id', obtenerPedidoAppPorId);

// Ruta para obtener todos los pedidos que están en estado de "tránsito"
// GET /api/appPedidos/transito
// Ideal para un panel de administración o monitoreo general.
// Debería estar protegida para roles administrativos.
// router.get('/transito', protect, obtenerPedidosEnTransito); // Ejemplo con protección
router.get('/transito', obtenerPedidosEnTransito);

// Ruta para obtener los pedidos de un usuario específico
// GET /api/appPedidos/user
// El userId se obtiene del token de autenticación (req.user._id).
// Esta ruta debe estar protegida para que un usuario solo pueda ver sus propios pedidos.
// router.get('/user', protect, obtenerPedidosPorUsuario); // Ejemplo con protección
router.get('/user', obtenerPedidosPorUsuario);

// Ruta para obtener los pedidos de una tienda específica
// GET /api/appPedidos/store/:storeId
// Esta ruta debería estar protegida para que solo los usuarios de esa tienda (o administradores)
// puedan acceder a los pedidos. El :storeId se pasa como parámetro en la URL.
// router.get('/store/:storeId', protect, obtenerPedidosPorTienda); // Ejemplo con protección
router.get('/store/:storeId', obtenerPedidosPorTienda);


export default router;