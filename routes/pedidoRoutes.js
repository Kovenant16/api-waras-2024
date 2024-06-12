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
    actualizarCoordenadasPedido
} from "../controllers/pedidoController.js";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.get("/", checkAuth,);
router.get("/motorizados", obtenerMotorizados);
router.get("/locales", obtenerLocales)
router.post('/obtenerClientes/',checkAuth, obtenerClientes)
router.get("/ultimosVeintePedidos", checkAuth, obtenerUltimosVeintePedidos);
router.get("/pedidosNoEntregados", checkAuth, obtenerPedidosNoEntregados);
router.get("/pedidosMotorizado", checkAuth, obtenerPedidosMotorizadoLogueado);
router.post('/obtenerPedidosPorFecha', checkAuth, obtenerPedidosPorFecha)
router.post('/obtenerPedidosPorFechaYDriver', checkAuth, obtenerPedidosPorFechaYDriver)
router.post('/obtenerPedidosPorFechasYLocal', checkAuth, obtenerPedidosPorFechasYLocal)
router.post('/busquedaPorTelefono', checkAuth, obtenerPedidosPorTelefono)
router.post('/busquedaPorTelefonoYLocal', checkAuth, obtenerPedidosPorTelefonoYLocal)
router.post('/pedidosSocio', checkAuth, obtenerPedidosSocio)
router.post('/pedidosMotorizado', obtenerPedidosMotorizado)
router.get('/pedidoSocio/:id', checkAuth, obtenerPedidoSocio)
router.post("/", checkAuth, nuevoPedido);
router.post("/obtenerPedidosPorTelefono", checkAuth,obtenerPedidosPorTelefonoConGps)
router.post("/obtenerPedidosPorTelefonoSinGps", checkAuth,obtenerPedidosSinGPS)
router.put("/aceptarPedido/:id", checkAuth, aceptarPedido)
router.put("/liberarPedido/:id", checkAuth, liberarPedido)
router.put("/marcarEnLocal/:id", checkAuth, marcarPedidoEnLocal)
router.put("/marcarRecogido/:id", checkAuth, marcarPedidoRecogido)
router.put("/marcarEntregado/:id", checkAuth, marcarPedidoEntregado)
router.put("/editarGPS/:id", checkAuth, actualizarCoordenadasPedido )
router
    .route("/:id")
    .get(checkAuth, obtenerPedido)
    .put(checkAuth, editarPedido)
    .delete(checkAuth, eliminarPedido);

export default router;
