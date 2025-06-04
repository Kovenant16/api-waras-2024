// controllers/appPedidoController.js

import PedidoApp from '../models/PedidoApp.js';
import mongoose from 'mongoose';
// import Usuario from '../models/usuario.js'; // Si necesitas interactuar con el modelo de usuario, impórtalo

const crearPedidoApp = async (req, res) => {
    try {
        // **IMPORTANTE:** Para seguridad, el `userId` debería obtenerse de la sesión del usuario autenticado
        // por ejemplo, si usas JSON Web Tokens (JWT), el `userId` estaría en `req.user._id`
        // Esto asume que tienes un middleware de autenticación que adjunta la información del usuario al objeto `req`.

        // Desestructurar el cuerpo de la solicitud (JSON de Flutter)
        const {
            userId,
            deliveryAddress,
            subtotal,
            deliveryCost,
            totalAmount,
            paymentMethod,
            cashPaymentDetails, // Este campo será undefined si no es efectivo, Mongoose lo manejará.
            notes,
            orderItems,
            orderDate,
            storeDetails
        } = req.body;

        // Validaciones adicionales antes de crear el documento (opcional, Mongoose ya valida mucho)
        if (!deliveryAddress || !orderItems || orderItems.length === 0 || !orderDate || !storeDetails) {
            return res.status(400).json({ msg: "Faltan campos obligatorios para el pedido de la aplicación." });
        }
        if (paymentMethod === 'efectivo' && (!cashPaymentDetails || typeof cashPaymentDetails.paidAmount === 'undefined')) {
            return res.status(400).json({ msg: "Detalles de pago en efectivo incompletos." });
        }

        // Crear una nueva instancia del modelo PedidoApp
        const nuevoPedidoApp = new PedidoApp({
            userId, // Asigna el ID del usuario autenticado
            deliveryAddress,
            subtotal,
            deliveryCost,
            totalAmount,
            paymentMethod,
            cashPaymentDetails,
            notes,
            orderItems,
            orderDate,
            storeDetails,
            // `tipoPedido` y `estadoPedido` se establecerán por defecto desde el esquema
        });

        // Guardar el pedido en la base de datos
        const pedidoGuardado = await nuevoPedidoApp.save();

        res.status(201).json({
            msg: "Pedido de la aplicación creado exitosamente",
            pedido: pedidoGuardado,
        });

    } catch (error) {
        console.error("Error al crear el pedido de la aplicación:", error);
        // Manejo de errores de validación de Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ msg: `Error de validación: ${messages.join(', ')}` });
        }
        res.status(500).json({ msg: "Error interno del servidor al crear el pedido de la aplicación." });
    }
};


const obtenerPedidoAppPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "ID de pedido inválido." });
        }

        const pedido = await PedidoApp.findById(id)
            .populate({
                path: 'userId',
                select: '-password -__v -token -codigoPais -pedidos -ubicaciones -createdAt -updatedAt'
            })
            .populate({
                path: 'storeDetails.storeId',
                select: '-__v -ratingPromedio -colaboradores -tipo -habilitado -createdAt -updatedAt -ruta -diasAbiertos -horaInicioFin -horario -tiempoPreparacion -tienda -ubicacion -urlLogo -tags -versionCarta'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v -local -descripcion -cover -opciones -opcionesMultiples  -disponibilidad -opcionesUnicas'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .exec();

        if (!pedido) {
            return res.status(404).json({ msg: "Pedido no encontrado." });
        }

        res.status(200).json({
            msg: "Pedido obtenido exitosamente",
            pedido,
        });

    } catch (error) {
        console.error("Error al obtener el pedido de la aplicación:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener el pedido de la aplicación." });
    }
};

const obtenerPedidosEnTransito = async (req, res) => {
    try {
        const estadosEnTransito = ["pendiente", "aceptado", "en local", "recogido"];

        const pedidos = await PedidoApp.find({
            estadoPedido: { $in: estadosEnTransito } // Busca pedidos cuyo estado esté en la lista
        })
            .populate({
                path: 'userId',
                select: '-password -__v -token'
            })
            .populate({
                path: 'storeDetails.storeId',
                select: '-__v'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .sort({ createdAt: -1 }) // Opcional: ordenar por fecha de creación descendente
            .exec();

        res.status(200).json({
            msg: "Pedidos en tránsito obtenidos exitosamente",
            pedidos,
            count: pedidos.length, // Para saber cuántos hay
        });

    } catch (error) {
        console.error("Error al obtener pedidos en tránsito:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener pedidos en tránsito." });
    }
};

const obtenerPedidosPorUsuario = async (req, res) => {
    try {
        // **IMPORTANTE:** El `userId` debe obtenerse del token de autenticación del usuario.
        // No confíes en un `userId` enviado en los parámetros de la URL o el cuerpo de la solicitud,
        // ya que un usuario malicioso podría intentar ver los pedidos de otro.
        const userId = req.user._id; // <--- Asume que `req.user` tiene el ID del usuario autenticado
        // Para pruebas sin autenticación, podrías usar: const userId = req.params.userId;
        // Pero en producción, es crucial usar el ID del usuario autenticado.

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ msg: "ID de usuario inválido o no proporcionado." });
        }

        const estadosEnTransito = ["pendiente", "aceptado", "en local", "recogido"];

        const pedidos = await PedidoApp.find({
            userId: userId,
            estadoPedido: { $in: estadosEnTransito }
        })
            .populate({
                path: 'userId', // Popula el usuario, aunque ya lo tenemos por el filtro, puede ser útil para consistencia
                select: '-password -__v -token'
            })
            .populate({
                path: 'storeDetails.storeId',
                select: '-__v'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .sort({ createdAt: -1 })
            .exec();

        res.status(200).json({
            msg: `Pedidos del usuario ${userId} en tránsito obtenidos exitosamente`,
            pedidos,
            count: pedidos.length,
        });

    } catch (error) {
        console.error("Error al obtener pedidos por usuario:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener pedidos por usuario." });
    }
};

const obtenerPedidosPorTienda = async (req, res) => {
    try {
        // **IMPORTANTE:** El `storeId` también debería validarse contra la tienda asociada al usuario autenticado (si es un usuario de tienda).
        // Por ahora, lo tomamos del parámetro de la URL.
        const { storeId } = req.params;

        if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ msg: "ID de tienda inválido o no proporcionado." });
        }

        // Para la tienda, probablemente querrá ver todos los pedidos, no solo los "en tránsito".
        // Si necesitas solo los en tránsito, puedes añadir la condición de `estadoPedido` aquí también.
        const pedidos = await PedidoApp.find({
            "storeDetails.storeId": storeId, // Filtra por el storeId dentro de storeDetails
        })
            .populate({
                path: 'userId',
                select: '-password -__v -token'
            })
            .populate({
                path: 'storeDetails.storeId', // Aunque ya lo tenemos por el filtro, puede ser útil para consistencia
                select: '-__v'
            })
            .populate({
                path: 'orderItems.productId',
                select: '-__v'
            })
            .populate({
                path: 'driver',
                select: '-password -__v -token'
            })
            .sort({ createdAt: -1 })
            .exec();

        res.status(200).json({
            msg: `Pedidos de la tienda ${storeId} obtenidos exitosamente`,
            pedidos,
            count: pedidos.length,
        });

    } catch (error) {
        console.error("Error al obtener pedidos por tienda:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener pedidos por tienda." });
    }
};






export { crearPedidoApp, obtenerPedidosPorTienda, obtenerPedidosPorUsuario, obtenerPedidosEnTransito, obtenerPedidoAppPorId };