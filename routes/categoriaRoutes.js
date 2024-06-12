import express from 'express'
import { agregarCategoria, obtenerCategorias } from '../controllers/CategoriasController.js'



const router = express.Router();

router.post("/agregarCategoria", agregarCategoria)
router.get("/obtenerCategorias", obtenerCategorias)


export default router;
