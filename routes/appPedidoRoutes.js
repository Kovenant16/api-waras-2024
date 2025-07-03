// routes/appPedidoRoutes.js

import express from 'express';
import {
    crearPedidoApp,
    obtenerPedidoAppPorId,
    obtenerPedidosEnTransito,
    obtenerPedidosPorUsuario,
    obtenerPedidosPorTienda,
    obtenerPedidosSinDriver,
    obtenerUltimosPedidosApp,
    marcarPedidoAppEnTienda,
    marcarPedidoAppRecogido,
    marcarPedidoEnDestino,
    marcarPedidoAppEntregado,
    marcarPedidoAppAceptado
} from '../controllers/appPedidoController.js';
import checkAuth from '../middleware/checkAuth.js'; // Asegúrate de tener un middleware de autenticación si es necesario

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
router.get('/obtenerPedidoPorId/:id', obtenerPedidoAppPorId);

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

router.get('/pedidosSinDriver',checkAuth, obtenerPedidosSinDriver);

router.get('/ultimos/:userId', obtenerUltimosPedidosApp);


// Ruta para marcar un pedido como 'en_tienda' (driver llegó a la tienda)
// Idealmente, esta ruta debería ser protegida por autenticación
// y posiblemente por un middleware que verifique si el usuario es un driver o admin.
router.put('/pedidos-app/en-tienda/:id',checkAuth, marcarPedidoAppEnTienda);


router.put('/pedidos-app/driver-asignado/:id',checkAuth, marcarPedidoAppAceptado);

// Ruta para marcar un pedido como 'recogido' (driver recogió el pedido)
// También debe ser protegida.
router.put('/pedidos-app/recogido/:id', checkAuth, marcarPedidoAppRecogido);

// Ruta para marcar un pedido como 'en_destino' (driver llegó a la dirección del cliente)
// También debe ser protegida.
router.put('/pedidos-app/en-destino/:id',  checkAuth, marcarPedidoEnDestino);

// Ruta para marcar un pedido como 'entregado' (pedido finalizado)
// También debe ser protegida.
router.put('/pedidos-app/entregado/:id',  checkAuth,   marcarPedidoAppEntregado);

export default router;