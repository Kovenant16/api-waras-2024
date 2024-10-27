import express from 'express'
import {
    obtenerTiendas,
    obtenerTienda,
    agregarProducto,
    obtenerProductosPorTienda,
    eliminarProducto,
    editarProducto,
    obtenerProductosPorCategoria,
    obtenerTiendasTotales,
    obtenerProductoPorId,
    toggleDisponibilidadProducto,
    obtenerProductosPorTiendaAdmin,
    obtenerProductosPorTiendaSinVersion
} from '../controllers/productoController.js'
import checkAuth from '../middleware/checkAuth.js';

const router = express.Router();

router.get("/tiendas", obtenerTiendas)
router.get("/tiendasTotales", obtenerTiendasTotales)
router.get("/:ruta", obtenerTienda)
router.get("/obtenerProducto/:productoId", obtenerProductoPorId)
router.post("/agregarProducto", agregarProducto)
router.put("/:id", editarProducto);
router.delete("/:id", eliminarProducto)
router.post("/obtenerProductosPorTienda", obtenerProductosPorTienda)
router.post("/obtenerProductosPorTiendaAdmin", obtenerProductosPorTiendaAdmin)
router.post("/obtenerProductosPorCategoria", obtenerProductosPorCategoria)
router.put("/toggleDisponibilidad/:id", toggleDisponibilidadProducto);

export default router;