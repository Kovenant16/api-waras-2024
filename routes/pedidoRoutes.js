import express from "express";
import {

    nuevoPedido,
    obtenerPedido,
    editarPedido,
    eliminarPedido,
    asignarMotorizado,
    obtenerPedidosMotorizadoLogueado,
    obtenerPedidosNoEntregados,
    obtenerPedidosSocio,
    obtenerUltimosVeintePedidos,
    obtenerPedidosPorFecha,
    obtenerMotorizados,
    obtenerPedidosMotorizado,
    obtenerLocales,
    obtenerClientes,
    obtenerPedidoSocio,
    aceptarPedido,
    liberarPedido,
    marcarPedidoEnLocal,
    marcarPedidoRecogido,
    marcarPedidoEntregado,
    obtenerPedidosPorFechasYLocal,
    obtenerPedidosPorFechaYDriver,
    obtenerPedidosPorTelefonoConGps,
    obtenerPedidosSinGPS,
    obtenerPedidosPorTelefono,
    obtenerPedidosPorTelefonoYLocal,
    actualizarCoordenadasPedido,
    obtenerMotorizadosActivos,
    nuevoPedidoSocio,
    obtenerPedidosPorTelefonoYLocalYGpsVacio,
    eliminarPedidoSocio,
    obtenerPedidosNoEntregadosPorLocal,
    obtenerPedidosNoEntregadosSinDriver,
    obtenerPedidosAsignados,
    obtenerPedidoPorTelefono,
    calcularPrecioDelivery,
    obtenerLocalPorTelefono,
    calcularPrecioDeliveryDos,
    obtenerTodosLosPedidosSinDriver,
    acceptAppOrder,
    acceptExpressOrder,
    acceptPackageOrder,
    getMyAssignedOrders,
    getDriverOrdersByDate,
    asignarDriver,
    liberarPedidoPorDriver,
    marcarPedidoRecogidoPorDriver,
    marcarPedidoEnLocalPorDriver,
    aceptarPedidoPorDriver,
    marcarPedidoEntregadoPorDriver,
    tomarPedidoExpressDirecto,
    tomarPedidoAppDirecto,
    tomarPedidoPaqueteDirecto
} from "../controllers/pedidoController.js";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.get("/", checkAuth,);
router.get("/motorizados", obtenerMotorizados);
router.get("/motorizadosActivos", obtenerMotorizadosActivos);
router.post("/obtenerPedidoPorTelefono", obtenerPedidoPorTelefono);
router.get("/locales", obtenerLocales)
router.post('/obtenerClientes/', checkAuth, obtenerClientes);
router.post('/asignarMotorizado/', checkAuth, asignarMotorizado);
router.post('/nuevoPedidoSocio/', checkAuth, nuevoPedidoSocio);
router.get("/ultimosVeintePedidos", checkAuth, obtenerUltimosVeintePedidos);
router.get("/pedidosNoEntregados", /*checkAuth,*/ obtenerPedidosNoEntregados);
router.get("/pedidosNoEntregadosSinDriver", checkAuth, obtenerPedidosNoEntregadosSinDriver);
router.get("/pedidosNoEntregados/:localId", checkAuth, obtenerPedidosNoEntregadosPorLocal);
router.get("/pedidosMotorizado", checkAuth, obtenerPedidosAsignados);
router.post('/obtenerPedidosPorFecha', checkAuth, obtenerPedidosPorFecha)
router.post('/obtenerPedidosPorFechaYDriver', checkAuth, obtenerPedidosPorFechaYDriver)
router.post('/obtenerPedidosPorFechasYLocal', checkAuth, obtenerPedidosPorFechasYLocal)
router.post('/busquedaPorTelefono', checkAuth, obtenerPedidosPorTelefono)
router.post('/busquedaPorTelefonoYLocal', checkAuth, obtenerPedidosPorTelefonoYLocal)
router.post('/busquedaPorTelefonoYLocalSinGps', checkAuth, obtenerPedidosPorTelefonoYLocalYGpsVacio)
router.post('/pedidosSocio', checkAuth, obtenerPedidosSocio)
router.get('/pedidoSocio/:id', checkAuth, obtenerPedidoSocio)
router.post("/", checkAuth, nuevoPedido);
router.post("/obtenerPedidosPorTelefono", checkAuth, obtenerPedidosPorTelefonoConGps)
router.post("/obtenerPedidosPorTelefonoSinGps", checkAuth, obtenerPedidosSinGPS)
router.put("/aceptarPedido/:id", checkAuth, aceptarPedido)
router.put("/liberarPedido/:id", checkAuth, liberarPedido)
router.put("/marcarEnLocal/:id", checkAuth, marcarPedidoEnLocal)
router.put("/marcarRecogido/:id", checkAuth, marcarPedidoRecogido)
router.put("/marcarEntregado/:id", checkAuth, marcarPedidoEntregado)
router.put("/editarGPS/:id", checkAuth, actualizarCoordenadasPedido)
router.delete("/eliminarPedidoSocio/:id", checkAuth, eliminarPedidoSocio)
router.post("/calcularPrecioDelivery", calcularPrecioDelivery)
router.post("/calcularPrecioDeliveryDos", calcularPrecioDeliveryDos)
router.post("/obtenerLocalPorTelefono", obtenerLocalPorTelefono)
router.get('/pedidosSinDriver', obtenerTodosLosPedidosSinDriver);
router
    .route("/:id")
    .get(checkAuth, obtenerPedido)
    .put(checkAuth, editarPedido)
    .delete(checkAuth, eliminarPedido);


// Nuevas rutas para aceptar pedidos
router.post('/app/accept/:id', checkAuth, acceptAppOrder);
router.post('/express/accept/:id', checkAuth, acceptExpressOrder);
router.post('/paqueteria/accept/:id', checkAuth, acceptPackageOrder);
router.get('/misPedidosAsignados/misPedidos', checkAuth, getMyAssignedOrders);
router.get('/orders/by-date', checkAuth, getDriverOrdersByDate);
router.patch('/liberarPedidoPorDriver/:id', checkAuth, liberarPedidoPorDriver);
router.patch('/marcarRecogidoPorDriver/:id', checkAuth, marcarPedidoRecogidoPorDriver);
router.patch('/marcarEnLocalPorDriver/:id', checkAuth, marcarPedidoEnLocalPorDriver);
router.patch('/aceptarPedidoPorDriver/:id', checkAuth, aceptarPedidoPorDriver);
router.patch('/marcarEntregadoPorDriver/:id', checkAuth, marcarPedidoEntregadoPorDriver);
router.put('/tomarPedidoExpress/:id', checkAuth, tomarPedidoExpressDirecto);
router.put('/tomarPedidoApp/:id', checkAuth, tomarPedidoAppDirecto);
router.put('/tomarPedidoPaqueteria/:id', checkAuth, tomarPedidoPaqueteDirecto);



export default router;
