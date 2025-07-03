import express from 'express';
import { crearEnvioPaquete, marcarPaqueteEnEntrega, marcarPedidoAceptado, marcarPedidoEnRecojo, marcarPedidoEntregado, marcarPedidoRecogido, obtenerEnvioPaquetePorId } from '../controllers/envioPaqueteController.js';
import checkAuth from '../middleware/checkAuth.js';

const router = express.Router();


// Ruta para crear un nuevo envío de paquete

router.post('/', crearEnvioPaquete);
router.get('/:id', obtenerEnvioPaquetePorId);

// Ruta para marcar un envío como 'aceptado' por el driver
// Ejemplo de URL: PUT http://localhost:4000/envio-paquete/aceptado/60c72b2f9b1d8f001c8e2b8c
router.put('/envio-paquete/aceptado/:id', checkAuth, marcarPedidoAceptado
);

// Ruta para marcar un envío como 'en_recojo' (driver en camino al punto de recojo)
// Ejemplo de URL: PUT http://localhost:4000/envio-paquete/en-recojo/:id
router.put('/envio-paquete/en-recojo/:id', checkAuth, marcarPedidoEnRecojo
);

// Ruta para marcar un envío como 'recogido' (el paquete ha sido recogido)
// Ejemplo de URL: PUT http://localhost:4000/envio-paquete/recogido/:id
router.put('/envio-paquete/recogido/:id', checkAuth, marcarPedidoRecogido
);

// Ruta para marcar un envío como 'en_entrega' (driver llegó al punto de entrega/destino final)
// Ejemplo de URL: PUT http://localhost:4000/envio-paquete/en-entrega/:id
router.put('/envio-paquete/en-entrega/:id', checkAuth, marcarPaqueteEnEntrega
);

// Ruta para marcar un envío como 'entregado' (el paquete ha sido finalizado)
// Ejemplo de URL: PUT http://localhost:4000/envio-paquete/entregado/:id
router.put('/envio-paquete/entregado/:id', checkAuth, marcarPedidoEntregado
);

export default router;