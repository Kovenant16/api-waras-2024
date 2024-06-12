import express from "express";

import { agregarLocal, editarLocal, toggleTiendaLocal, eliminarLocal } from "../controllers/localController.js";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

router.post("/", checkAuth, agregarLocal);
router.put("/:id", checkAuth, editarLocal);
router.put("/toggleTiendalocal/:id",checkAuth, toggleTiendaLocal);
router.delete("/:id", checkAuth, eliminarLocal);


export default router;
