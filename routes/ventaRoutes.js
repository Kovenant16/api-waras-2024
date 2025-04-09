import express from "express";
//import { nuevaVenta, obtenerVentas, obtenerVenta, editarVenta, eliminarVenta } from "../controllers/ventaController.js";
import { nuevaVenta, obtenerVentas, obtenerVenta, editarVenta, eliminarVenta } from "../controllers/ventaController.js";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.post("/", checkAuth, nuevaVenta); // Crear venta
router.get("/", checkAuth, obtenerVentas); // Obtener todas las ventas
router.get("/:id", checkAuth, obtenerVenta); // Obtener una venta por ID
router.put("/:id", checkAuth, editarVenta); // Editar una venta
router.delete("/:id", checkAuth, eliminarVenta); // Eliminar una venta

export default router;
