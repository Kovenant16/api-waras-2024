import express from "express";

import { obtenerOrdenesClientes, nuevaOrdenCliente, borrarOrdenCliente, obtenerOrdenesPorLocal } from "../controllers/ordenesClienteController.js";

import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.post("/nuevaOrdenCliente", nuevaOrdenCliente)
router.post("/obtenerOrdenesPorTienda",checkAuth, obtenerOrdenesPorLocal)
router.post("/obtenerOrdenesCliente", checkAuth, obtenerOrdenesClientes)
router.delete('/:id', borrarOrdenCliente);


export default router;