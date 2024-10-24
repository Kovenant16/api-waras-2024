import express from "express";

import { obtenerOrdenesClientes, nuevaOrdenCliente } from "../controllers/ordenesClienteController.js";

import checkAuth from "../middleware/checkAuth.js";

const router  = express.Router();

router.post("/nuevaOrdenCliente",  nuevaOrdenCliente)
router.post("/obtenerOrdenesCliente", checkAuth, obtenerOrdenesClientes)


export default router;