import express from "express";

import { agregarCliente,buscarClientesPorTelefono } from "../controllers/clienteController.js";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.get("/", checkAuth, agregarCliente);
router.post("/buscarClientesPorTelefono", checkAuth, buscarClientesPorTelefono)

export default router;
