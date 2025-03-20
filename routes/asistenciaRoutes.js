import express from 'express';
import {
  obtenerAsistencias,
  obtenerAsistencia,
  crearAsistencia,
  registrarSalida,
  agregarNuevoRegistro,
  eliminarAsistencia,
  obtenerAsistenciasPorFecha
} from '../controllers/asistenciaController.js';
import checkAuth from "../middleware/checkAuth.js"


const router = express.Router();

router.route('/')
  .get(checkAuth, obtenerAsistencias)
  .post(checkAuth, crearAsistencia);

router.route('/:id')
  .get(checkAuth, obtenerAsistencia)
  .delete(checkAuth, eliminarAsistencia);

router.patch('/:id/salida/:recordIndex', checkAuth, registrarSalida);
router.post('/:id/registro', checkAuth, agregarNuevoRegistro);

router.post('/obtenerAsistenciaPorFecha', checkAuth, obtenerAsistenciasPorFecha);

export default router;