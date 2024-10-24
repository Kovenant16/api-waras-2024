import express from "express";

import { obtenerOrdenesClientes,nuevaOrdenCliente } from "../controllers/OrdenClienteController.js";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.post("/nuevaOrdenCliente",  nuevaOrdenCliente)
router.post("/obtenerOrdenesCliente/",  obtenerOrdenesClientes)

export default router;