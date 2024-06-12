import express from "express";

import {
    nuevoPedidoMesa
} from "../controllers/pedidoMesaController.js"
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.post("/nuevoPedidoMesa", checkAuth, nuevoPedidoMesa)